import type { DatabaseSync } from 'node:sqlite'
import { HttpError } from '../../http/errors.ts'
import { latestValidVersionId, recordAchievedDate } from '../records/record-queries.ts'
import type { voidReasons } from '../records/records.store.ts'

const pageSize = 20

export type RecordSort = 'holding' | 'recent'
export type RankingCategory = 'driver' | 'car' | 'pet'
export type PublicStore = ReturnType<typeof createPublicStore>

interface RecordQuery {
    keyword: string
    stars: number | null
    sort: RecordSort
    page: number
}

export interface TrackRow {
    trackId: number
    trackName: string
    stars: number | null
    status: 'active' | 'archived'
    coverObjectKey: string | null
}

export interface VersionedRunRow {
    versionId: number
    runId: number
    kind: 'set' | 'restore'
    previousVersionId: number | null
    effectiveAt: string
    timeMs: number
    achievedAt: string
    driverId: number
    driverName: string
    driverImageKey: string | null
    teamId: number | null
    teamName: string | null
    carId: number | null
    carName: string | null
    petId: number | null
    petName: string | null
    screenshotObjectKey: string | null
    videoUrl: string | null
    voidReason: typeof voidReasons[number] | null
    voidedAt: string | null
}

type BoardRow = TrackRow & VersionedRunRow
type DetailRow = TrackRow & (VersionedRunRow | { versionId: null }) & { currentVersionId: number | null }

interface RankingRow {
    id: number
    name: string
    imageObjectKey: string | null
    teamId: number | null
    teamName: string | null
    nationalRecordCount: number
}

const rankingTables = { driver: 'drivers', car: 'cars', pet: 'pets' } as const

const trackColumns = `track.id AS trackId, track.name AS trackName, track.stars, track.status,
    cover.object_key AS coverObjectKey`
const runColumns = `version.id AS versionId, version.kind, version.previous_version_id AS previousVersionId,
    version.created_at AS effectiveAt, run.id AS runId, run.time_cs * 10 AS timeMs,
    ${recordAchievedDate('run.achieved_at')} AS achievedAt, driver.id AS driverId, driver.name AS driverName,
    avatar.object_key AS driverImageKey, team.id AS teamId, team.name AS teamName,
    car.id AS carId, car.name AS carName, pet.id AS petId, pet.name AS petName,
    screenshot.object_key AS screenshotObjectKey, run.video_url AS videoUrl,
    run.void_reason AS voidReason, run.voided_at AS voidedAt`
const currentVersionId = latestValidVersionId('track.id')
const optionalRecordJoins = `LEFT JOIN teams AS team ON team.id = run.team_id
    LEFT JOIN cars AS car ON car.id = run.car_id
    LEFT JOIN pets AS pet ON pet.id = run.pet_id
    LEFT JOIN files AS avatar ON avatar.id = driver.image_file_id
    LEFT JOIN files AS screenshot ON screenshot.id = run.screenshot_file_id
    LEFT JOIN files AS cover ON cover.id = track.cover_file_id`

function normalized(text: string) {
    return text.normalize('NFKC').trim().toLowerCase()
}

export function recordHoldingMs(achievedAt: string, endMs: number) {
    const startMs = Date.parse(`${achievedAt}T00:00:00+08:00`)
    return Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0
}

export function createPublicStore(db: DatabaseSync) {
    db.function('public_search_text', { deterministic: true }, value => typeof value === 'string' ? normalized(value) : '')

    const recordList = db.prepare(`WITH current_versions AS (
            SELECT max(version.id) AS id
            FROM record_versions AS version
            JOIN runs AS run ON run.id = version.run_id
            WHERE run.status = 'valid'
            GROUP BY version.track_id
        )
        SELECT ${trackColumns}, ${runColumns}
        FROM current_versions
        JOIN record_versions AS version ON version.id = current_versions.id
        JOIN runs AS run ON run.id = version.run_id
        JOIN tracks AS track ON track.id = version.track_id
        JOIN drivers AS driver ON driver.id = run.driver_id
        ${optionalRecordJoins}
        WHERE track.status = 'active' AND ($stars IS NULL OR track.stars = $stars)
            AND ($keyword = '' OR instr(public_search_text(track.name), $keyword) > 0
                OR instr(public_search_text(driver.name), $keyword) > 0
                OR instr(public_search_text(team.name), $keyword) > 0)
        ORDER BY CASE WHEN $sort = 'holding' THEN achievedAt END ASC NULLS LAST,
            CASE WHEN $sort = 'recent' THEN version.created_at END DESC,
            track.name, track.id`)

    const trackDetail = db.prepare(`WITH selected_track AS MATERIALIZED (
            SELECT track.*, ${currentVersionId} AS currentVersionId
            FROM tracks AS track WHERE track.id = ? AND track.status <> 'disabled'
        )
        SELECT ${trackColumns}, ${runColumns}, track.currentVersionId
        FROM selected_track AS track LEFT JOIN record_versions AS version ON version.track_id = track.id
        LEFT JOIN runs AS run ON run.id = version.run_id
        LEFT JOIN drivers AS driver ON driver.id = run.driver_id
        ${optionalRecordJoins}
        ORDER BY version.id DESC`)

    const rankings = {
        driver: rankingQuery('driver'),
        car: rankingQuery('car'),
        pet: rankingQuery('pet'),
    }

    function rankingQuery(category: RankingCategory) {
        const teamColumns = category === 'driver' ? 'team.id AS teamId, team.name AS teamName' : 'NULL AS teamId, NULL AS teamName'
        const teamJoin = category === 'driver' ? 'LEFT JOIN teams AS team ON team.id = entity.team_id' : ''
        return db.prepare(`WITH counts AS (
                SELECT run.${category}_id AS id, count(*) AS nationalRecordCount
                FROM tracks AS track JOIN record_versions AS version ON version.id = ${currentVersionId}
                JOIN runs AS run ON run.id = version.run_id
                WHERE track.status = 'active' AND run.${category}_id IS NOT NULL
                GROUP BY run.${category}_id
            )
            SELECT entity.id, entity.name, image.object_key AS imageObjectKey, ${teamColumns}, counts.nationalRecordCount
            FROM counts JOIN ${rankingTables[category]} AS entity ON entity.id = counts.id
            LEFT JOIN files AS image ON image.id = entity.image_file_id ${teamJoin}
            ORDER BY counts.nationalRecordCount DESC, entity.id ASC`)
    }

    function queryRecords({ keyword, stars, sort }: Omit<RecordQuery, 'page'>) {
        return recordList.all({ keyword: normalized(keyword), stars, sort }) as unknown as BoardRow[]
    }

    return {
        listAll() {
            return queryRecords({ keyword: '', stars: null, sort: 'holding' })
        },
        list({ keyword, stars, sort, page }: RecordQuery) {
            const rows = queryRecords({ keyword, stars, sort })
            const total = rows.length
            const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
            const offset = (currentPage - 1) * pageSize
            return { items: rows.slice(offset, offset + pageSize), total, page: currentPage, pageSize }
        },
        track(id: number) {
            const rows = trackDetail.all(id) as unknown as DetailRow[]
            const track = rows[0]
            if (!track) throw new HttpError(404, 'TRACK_NOT_FOUND', '赛道不存在')

            const versions = rows.filter(row => row.versionId !== null)
            const current = versions.find(version => version.versionId === track.currentVersionId) ?? null
            const runIds = new Set<number>()
            const versionsById = new Map(versions.map(version => [version.versionId, version]))
            let brokenCount = 0
            let longestHoldingMs = 0
            let currentHoldingMs = 0
            const now = Date.now()

            const history = versions.map((version, index) => {
                const nextAt = versions[index - 1]?.effectiveAt ?? null
                const endedAt = version.voidedAt && (!nextAt || version.voidedAt < nextAt) ? version.voidedAt : nextAt
                const holdingMs = recordHoldingMs(version.achievedAt, endedAt ? Date.parse(endedAt) : now)
                const previous = version.previousVersionId === null ? undefined : versionsById.get(version.previousVersionId)
                runIds.add(version.runId)
                if (!version.voidedAt) {
                    longestHoldingMs = Math.max(longestHoldingMs, holdingMs)
                    if (version.kind === 'set' && previous && !previous.voidedAt && version.timeMs < previous.timeMs) brokenCount++
                }
                if (version.versionId === track.currentVersionId) currentHoldingMs = holdingMs
                return { version, endedAt, holdingMs }
            })

            return {
                track, current, history,
                stats: { historicalRecordCount: runIds.size, brokenCount, currentHoldingMs, longestHoldingMs },
            }
        },
        rankings(category: RankingCategory) {
            return rankings[category].all() as unknown as RankingRow[]
        },
    }
}
