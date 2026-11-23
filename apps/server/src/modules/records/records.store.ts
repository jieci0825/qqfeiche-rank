import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { HttpError } from '../../http/errors.ts'
import { createFileStore, type UploadedFile } from '../files/files.store.ts'
import type { AuthorizedActor } from '../rbac/rbac.store.ts'
import { latestValidVersionId, recordAchievedDate } from './record-queries.ts'

export const voidReasons = ['bug', 'reset', 'cheat', 'boost', 'mistake', 'other'] as const
type VoidReason = typeof voidReasons[number]
export type RecordTrackFilter = 'all' | 'current' | 'empty'
export type RecordEntryMode = 'first' | 'next'

export interface RecordMetadata {
    driverId: number
    teamId: number | null
    carId: number | null
    petId: number | null
    ecu: string[]
    videoUrl: string | null
    note: string | null
    screenshotFile?: UploadedFile | null
}

export interface RecordInput extends RecordMetadata {
    trackId: number
    timeMs: number
    achievedAt: string
}

interface StoredRun extends Omit<RecordInput, 'ecu' | 'screenshotFile'> {
    id: number
    ecu: string
    screenshotFileId: number | null
    status: 'valid' | 'voided'
    createdAt: string
    createdBy: number | null
    voidReason: VoidReason | null
    voidNote: string | null
    voidedAt: string | null
    voidedBy: number | null
}

interface RecordRow extends StoredRun {
    trackName: string
    trackCoverObjectKey: string | null
    driverName: string
    teamName: string | null
    carName: string | null
    petName: string | null
    screenshotObjectKey: string | null
    isCurrent: 0 | 1
    effectiveAt: string | null
    createdByName: string | null
    voidedByName: string | null
}

interface CurrentRecord {
    versionId: number
    id: number
    driverName: string
    timeMs: number
    achievedAt: string
    effectiveAt: string
}

interface RecordTrackRow {
    trackId: number
    trackName: string
    status: 'active' | 'disabled' | 'archived'
    coverObjectKey: string | null
}

export type ListedRecordTrack = RecordTrackRow & ({ runId: null } | {
    runId: number
    timeMs: number
    driverName: string
    teamName: string | null
    achievedAt: string
})

interface RecordVersion {
    id: number
    kind: 'set' | 'restore'
    effectiveAt: string
    operatorName: string | null
}

interface VoidInput {
    reason: VoidReason
    note: string | null
    currentVersionId: number | null
    recoveryVersionId: number | null
}

const beijingDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', dateStyle: 'short' })
const achievedDate = recordAchievedDate('achieved_at')
const runColumns = `id, track_id AS trackId, driver_id AS driverId, team_id AS teamId,
    car_id AS carId, pet_id AS petId, ecu, time_cs * 10 AS timeMs, ${achievedDate} AS achievedAt,
    screenshot_file_id AS screenshotFileId, video_url AS videoUrl, note, status,
    created_at AS createdAt, created_by AS createdBy, void_reason AS voidReason,
    void_note AS voidNote, voided_at AS voidedAt, voided_by AS voidedBy`
const recordSource = `FROM (SELECT ${runColumns} FROM runs) AS run
    JOIN tracks AS track ON track.id = run.trackId
    LEFT JOIN files AS track_cover ON track_cover.id = track.cover_file_id
    JOIN drivers AS driver ON driver.id = run.driverId
    LEFT JOIN teams AS team ON team.id = run.teamId
    LEFT JOIN cars AS car ON car.id = run.carId
    LEFT JOIN pets AS pet ON pet.id = run.petId
    LEFT JOIN files AS screenshot ON screenshot.id = run.screenshotFileId
    LEFT JOIN admins AS creator ON creator.id = run.createdBy
    LEFT JOIN admins AS voider ON voider.id = run.voidedBy
    LEFT JOIN record_versions AS current_version ON current_version.id = ${latestValidVersionId('run.trackId')}`
const selectRecord = `SELECT run.*, track.name AS trackName, driver.name AS driverName,
    track_cover.object_key AS trackCoverObjectKey,
    team.name AS teamName, car.name AS carName, pet.name AS petName,
    screenshot.object_key AS screenshotObjectKey, current_version.run_id IS run.id AS isCurrent,
    CASE WHEN current_version.run_id = run.id THEN current_version.created_at END AS effectiveAt,
    creator.display_name AS createdByName, voider.display_name AS voidedByName
    ${recordSource}`
const trackSource = `FROM (SELECT track_id, max(id) AS lastRunId FROM runs GROUP BY track_id) AS recorded
    JOIN tracks AS track ON track.id = recorded.track_id
    LEFT JOIN record_versions AS current_version ON current_version.id = ${latestValidVersionId('track.id')}`
const trackFilter = `WHERE ($state = 'all' OR (current_version.id IS NOT NULL) = ($state = 'current'))
    AND ($keyword = '' OR instr(lower(track.name), $keyword) > 0 OR EXISTS (
        SELECT 1 FROM runs AS history
        JOIN drivers AS driver ON driver.id = history.driver_id
        LEFT JOIN teams AS team ON team.id = history.team_id
        WHERE history.track_id = track.id AND history.status = 'valid'
            AND (instr(lower(driver.name), $keyword) > 0 OR instr(lower(team.name), $keyword) > 0)
    ))`

export type RecordStore = ReturnType<typeof createRecordStore>
export type ListedRecord = Omit<RecordRow, 'ecu' | 'isCurrent'> & { ecu: string[]; isCurrent: boolean }

function presentRow(row: RecordRow): ListedRecord {
    return { ...row, ecu: JSON.parse(row.ecu) as string[], isCurrent: Boolean(row.isCurrent) }
}

export function createRecordStore(db: DatabaseSync) {
    const files = createFileStore(db)
    const listTracks = db.prepare(`SELECT track.id AS trackId, track.name AS trackName, track.status,
        cover.object_key AS coverObjectKey, run.id AS runId, run.time_cs * 10 AS timeMs,
        driver.name AS driverName, team.name AS teamName, ${recordAchievedDate('run.achieved_at')} AS achievedAt
        ${trackSource}
        LEFT JOIN files AS cover ON cover.id = track.cover_file_id
        LEFT JOIN runs AS run ON run.id = current_version.run_id
        LEFT JOIN drivers AS driver ON driver.id = run.driver_id
        LEFT JOIN teams AS team ON team.id = run.team_id
        ${trackFilter} ORDER BY recorded.lastRunId DESC LIMIT $limit OFFSET $offset`)
    const countTracks = db.prepare(`SELECT count(*) AS total ${trackSource} ${trackFilter}`)
    const listTrackRuns = db.prepare(`${selectRecord} WHERE run.trackId = ?
        ORDER BY isCurrent DESC, run.id DESC`)
    const trackHasRuns = db.prepare('SELECT 1 FROM runs WHERE track_id = ? LIMIT 1')
    const runById = db.prepare(`SELECT ${runColumns} FROM runs WHERE id = ?`)
    const recordById = db.prepare(`${selectRecord} WHERE run.id = ?`)
    const listVersions = db.prepare(`SELECT version.id, version.kind, version.created_at AS effectiveAt,
        admin.display_name AS operatorName FROM record_versions AS version
        LEFT JOIN admins AS admin ON admin.id = version.created_by WHERE version.run_id = ? ORDER BY version.id DESC`)
    const latestValid = db.prepare(`SELECT version.id AS versionId, run.id, driver.name AS driverName,
        run.time_cs * 10 AS timeMs, ${achievedDate} AS achievedAt, version.created_at AS effectiveAt
        FROM record_versions AS version JOIN runs AS run ON run.id = version.run_id
        JOIN drivers AS driver ON driver.id = run.driver_id
        WHERE version.id = ${latestValidVersionId('?', '?')}`)
    const duplicate = db.prepare(`SELECT id FROM runs WHERE track_id = ? AND driver_id = ? AND time_cs = ?
        AND ${achievedDate} = ? AND id IS NOT ?`)
    const insert = db.prepare(`INSERT INTO runs (track_id, driver_id, team_id, car_id, pet_id, ecu, time_cs, achieved_at,
        screenshot_file_id, video_url, note, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING ${runColumns}`)
    const update = db.prepare(`UPDATE runs SET driver_id = ?, team_id = ?, car_id = ?, pet_id = ?, ecu = ?,
        screenshot_file_id = ?, video_url = ?, note = ? WHERE id = ? RETURNING ${runColumns}`)
    const voidRun = db.prepare(`UPDATE runs SET status = 'voided', void_reason = ?, void_note = ?, voided_at = ?,
        voided_by = ? WHERE id = ? RETURNING ${runColumns}`)
    const addVersion = db.prepare(`INSERT INTO record_versions (track_id, run_id, kind, previous_version_id,
        trigger_run_id, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`)
    const addAudit = db.prepare(`INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, ip, created_at)
        VALUES (?, ?, 'run', ?, ?, ?, ?)`)

    const trackOptions = db.prepare(`SELECT track.id, track.name, cover.object_key AS coverObjectKey
        FROM tracks AS track LEFT JOIN files AS cover ON cover.id = track.cover_file_id
        WHERE track.status = 'active' AND NOT EXISTS (SELECT 1 FROM runs WHERE track_id = track.id)
        ORDER BY track.name`)
    const driverOptions = db.prepare(`SELECT driver.id, driver.name, team.id AS teamId FROM drivers AS driver
        LEFT JOIN teams AS team ON team.id = driver.team_id AND team.status = 'active'
        WHERE driver.status = 'active' ORDER BY driver.name`)
    const teamOptions = db.prepare("SELECT id, name FROM teams WHERE status = 'active' ORDER BY name")
    const carOptions = db.prepare("SELECT id, name FROM cars WHERE status = 'active' ORDER BY name")
    const petOptions = db.prepare("SELECT id, name FROM pets WHERE status = 'active' ORDER BY name")
    const carEcus = db.prepare(`SELECT ecu.car_id AS carId, ecu.name FROM car_ecus AS ecu
        JOIN cars AS car ON car.id = ecu.car_id WHERE car.status = 'active' ORDER BY ecu.car_id, ecu.position`)
    const trackStatus = db.prepare('SELECT status FROM tracks WHERE id = ?')
    const driverStatus = db.prepare('SELECT status FROM drivers WHERE id = ?')
    const teamStatus = db.prepare('SELECT status FROM teams WHERE id = ?')
    const carStatus = db.prepare('SELECT status FROM cars WHERE id = ?')
    const petStatus = db.prepare('SELECT status FROM pets WHERE id = ?')

    function requireRun(id: number) {
        const run = runById.get(id) as unknown as StoredRun | undefined
        if (!run) throw new HttpError(404, 'RECORD_NOT_FOUND', '成绩不存在')
        return run
    }

    function requireValid(run: StoredRun) {
        if (run.status === 'voided') throw new HttpError(409, 'RECORD_VOIDED', '该成绩已作废')
    }

    function requireActive(statement: typeof trackStatus, id: number | null, label: string, previous?: number | null) {
        if (id !== null && id !== previous && statement.get(id)?.status !== 'active') {
            throw new HttpError(400, 'INVALID_RECORD_REFERENCE', `请选择已启用的${label}`)
        }
    }

    function validateMetadata(input: RecordMetadata, previous?: StoredRun) {
        requireActive(driverStatus, input.driverId, '车手', previous?.driverId)
        requireActive(teamStatus, input.teamId, '车队', previous?.teamId)
        requireActive(carStatus, input.carId, '赛车', previous?.carId)
        requireActive(petStatus, input.petId, '宠物', previous?.petId)
    }

    function requireUnique(trackId: number, driverId: number, timeMs: number, achievedAt: string, id: number | null) {
        if (duplicate.get(trackId, driverId, timeMs / 10, achievedAt, id)) {
            throw new HttpError(409, 'DUPLICATE_RECORD', '这条成绩已录入')
        }
    }

    function current(trackId: number, excludingRunId: number | null = null) {
        return (latestValid.get(trackId, excludingRunId) as unknown as CurrentRecord | undefined) ?? null
    }

    function voidImpact(run: StoredRun) {
        const currentRecord = current(run.trackId)
        if (currentRecord?.id !== run.id) return { effect: 'unchanged' as const, current: currentRecord, recovery: null }
        const recovery = current(run.trackId, run.id)
        return { effect: recovery ? 'restore' as const : 'empty' as const, current: currentRecord, recovery }
    }

    function detail(id: number) {
        const record = recordById.get(id) as unknown as RecordRow | undefined
        if (!record) throw new HttpError(404, 'RECORD_NOT_FOUND', '成绩不存在')
        return { ...presentRow(record), versions: listVersions.all(id) as unknown as RecordVersion[] }
    }

    return {
        list(keyword: string, state: RecordTrackFilter, page: number, pageSize: number) {
            const params = { keyword, state }
            const total = Number(countTracks.get(params)?.total)
            const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
            const items = listTracks.all({ ...params, limit: pageSize, offset: (currentPage - 1) * pageSize }) as unknown as ListedRecordTrack[]
            return { items, total, page: currentPage, pageSize }
        },

        trackRuns(trackId: number) {
            if (!trackStatus.get(trackId)) throw new HttpError(404, 'TRACK_NOT_FOUND', '赛道不存在')
            return (listTrackRuns.all(trackId) as unknown as RecordRow[]).map(presentRow)
        },

        detail,
        current(trackId: number) {
            if (!trackStatus.get(trackId)) throw new HttpError(404, 'TRACK_NOT_FOUND', '赛道不存在')
            return current(trackId)
        },

        options() {
            const ecusByCar = new Map<number, string[]>()
            for (const { carId, name } of carEcus.all() as { carId: number; name: string }[]) {
                const ecus = ecusByCar.get(carId)
                if (ecus) ecus.push(name)
                else ecusByCar.set(carId, [name])
            }
            return {
                tracks: trackOptions.all() as { id: number; name: string; coverObjectKey: string | null }[],
                drivers: driverOptions.all(), teams: teamOptions.all(),
                cars: (carOptions.all() as { id: number; name: string }[]).map(car => ({ ...car, ecu: ecusByCar.get(car.id) ?? [] })),
                pets: petOptions.all(),
            }
        },

        create(input: RecordInput, mode: RecordEntryMode, actor: AuthorizedActor) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                requireActive(trackStatus, input.trackId, '赛道')
                const hasRuns = Boolean(trackHasRuns.get(input.trackId))
                if (mode === 'first' && hasRuns) {
                    throw new HttpError(409, 'TRACK_ALREADY_HAS_RECORDS', '该赛道已有录入记录，请从赛道行录入新纪录')
                }
                if (mode === 'next' && !hasRuns) {
                    throw new HttpError(409, 'TRACK_HAS_NO_RECORDS', '该赛道尚未录入成绩，请使用首次录入')
                }
                validateMetadata(input)
                const clock = new Date()
                const now = clock.toISOString()
                if (input.achievedAt > beijingDate.format(clock)) {
                    throw new HttpError(400, 'INVALID_RECORD_INPUT', '达成日期不能晚于今天')
                }
                const { trackId, driverId, timeMs, achievedAt, teamId, carId, petId, ecu, screenshotFile, videoUrl, note } = input
                requireUnique(trackId, driverId, timeMs, achievedAt, null)
                const before = current(trackId)
                if (before && timeMs >= before.timeMs) {
                    const minutes = Math.floor(before.timeMs / 60000)
                    const seconds = String(Math.floor(before.timeMs / 1000) % 60).padStart(2, '0')
                    const hundredths = String(before.timeMs / 10 % 100).padStart(2, '0')
                    throw new HttpError(409, 'RECORD_NOT_FASTER', `新成绩须快于当前纪录 ${minutes}:${seconds}.${hundredths}`)
                }
                const fileId = screenshotFile ? files.registerUpload(screenshotFile, adminId, now) : null
                const after = insert.get(trackId, driverId, teamId, carId, petId, JSON.stringify(ecu), timeMs / 10, achievedAt,
                    fileId, videoUrl, note, now, adminId) as unknown as StoredRun
                const version = addVersion.get(trackId, after.id, 'set', before?.versionId ?? null, null, now, adminId)
                addAudit.run(adminId, 'run.create', after.id, JSON.stringify({ after, versionId: version?.id }), actor.ip, now)
                return detail(after.id)
            })
        },

        update(id: number, input: RecordMetadata, actor: AuthorizedActor) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                const before = requireRun(id)
                requireValid(before)
                validateMetadata(input, before)
                if (input.driverId !== before.driverId) {
                    requireUnique(before.trackId, input.driverId, before.timeMs, before.achievedAt, id)
                }
                const { driverId, teamId, carId, petId, ecu, screenshotFile, videoUrl, note } = input
                const now = new Date().toISOString()
                const fileId = screenshotFile === undefined ? before.screenshotFileId
                    : screenshotFile && files.registerUpload(screenshotFile, adminId, now)
                const after = update.get(driverId, teamId, carId, petId, JSON.stringify(ecu), fileId, videoUrl, note, id) as unknown as StoredRun
                addAudit.run(adminId, 'run.update_meta', id, JSON.stringify({ before, after }), actor.ip, now)
                return detail(id)
            })
        },

        previewVoid(id: number) {
            const run = requireRun(id)
            requireValid(run)
            return voidImpact(run)
        },

        void(id: number, input: VoidInput, actor: AuthorizedActor) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                const before = requireRun(id)
                requireValid(before)
                const impact = voidImpact(before)
                if (input.currentVersionId !== (impact.current?.versionId ?? null) ||
                    input.recoveryVersionId !== (impact.recovery?.versionId ?? null)) {
                    throw new HttpError(409, 'RECORD_VOID_IMPACT_CHANGED', '当前纪录或回退目标已变化，请重新确认')
                }
                const now = new Date().toISOString()
                const after = voidRun.get(input.reason, input.note, now, adminId, id) as unknown as StoredRun
                const restored = impact.recovery && addVersion.get(before.trackId, impact.recovery.id, 'restore',
                    impact.current?.versionId ?? null, id, now, adminId)
                addAudit.run(adminId, 'run.void', id, JSON.stringify({ before, after, impact, restoredVersionId: restored?.id ?? null }), actor.ip, now)
                return { record: detail(id), current: current(before.trackId) }
            })
        },
    }
}
