import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { HttpError } from '../../http/errors.ts'
import { createFileStore, type UploadedFile } from '../files/files.store.ts'
import type { AuthorizedActor } from '../rbac/rbac.store.ts'
import { dataResources, type DataResource, type DataResourceKey } from './data.resources.ts'

type DataStatus = 'active' | 'disabled' | 'archived'

export interface DataInput {
    name: string
    status?: Exclude<DataStatus, 'archived'>
    imageFile?: UploadedFile
    teamId?: number | null
    ecu?: string[]
}

export interface DataRecord {
    id: number
    name: string
    status: DataStatus
    createdAt: string
    updatedAt: string
    imageFileId?: number | null
    imageObjectKey?: string | null
    teamId?: number | null
    teamName?: string | null
    teamStatus?: DataStatus | null
    ecu?: string[]
}

export type DataStore = ReturnType<typeof createDataStore>

export function createDataStore(db: DatabaseSync) {
    const files = createFileStore(db)
    const teamById = db.prepare('SELECT status FROM teams WHERE id = ?')
    const teamOptions = db.prepare("SELECT id, name FROM teams WHERE status = 'active' ORDER BY name, id")
    const deleteCarEcus = db.prepare('DELETE FROM car_ecus WHERE car_id = ?')
    const insertCarEcu = db.prepare('INSERT INTO car_ecus (car_id, position, name) VALUES (?, ?, ?)')
    const audit = db.prepare(`
        INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, ip, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    function createResourceStore(key: DataResourceKey) {
        const { entity, label, image }: DataResource = dataResources[key]
        const fields = ['name', 'status']
        const columns = ['r.id', 'r.name', 'r.status', 'r.created_at AS createdAt', 'r.updated_at AS updatedAt']
        const joins: string[] = []
        if (image) {
            fields.push('image_file_id')
            columns.push('r.image_file_id AS imageFileId', 'files.object_key AS imageObjectKey')
            joins.push('LEFT JOIN files ON files.id = r.image_file_id')
        }
        if (key === 'drivers') {
            fields.push('team_id')
            columns.push('r.team_id AS teamId', 'teams.name AS teamName', 'teams.status AS teamStatus')
            joins.push('LEFT JOIN teams ON teams.id = r.team_id')
        }
        if (key === 'cars') {
            columns.push(`(
                SELECT json_group_array(name ORDER BY position) FROM car_ecus WHERE car_id = r.id
            ) AS ecuJson`)
        }

        const select = `SELECT ${columns.join(', ')} FROM ${key} AS r ${joins.join(' ')}`
        const list = db.prepare(`${select} ORDER BY r.name, r.id`)
        const byId = db.prepare(`${select} WHERE r.id = ?`)
        const byName = db.prepare(`SELECT id FROM ${key} WHERE name = ?`)
        const insert = db.prepare(`
            INSERT INTO ${key} (${fields.join(', ')}, created_at, updated_at)
            VALUES (${fields.map(() => '?').join(', ')}, ?, ?)
        `)
        const update = db.prepare(`
            UPDATE ${key} SET ${fields.map(field => `${field} = ?`).join(', ')}, updated_at = ? WHERE id = ?
        `)
        const archive = db.prepare(`UPDATE ${key} SET status = 'archived', updated_at = ? WHERE id = ?`)

        function readRecord(row: unknown): DataRecord {
            const { ecuJson, ...record } = row as Omit<DataRecord, 'ecu'> & { ecuJson?: string }
            return ecuJson === undefined ? record : { ...record, ecu: JSON.parse(ecuJson) as string[] }
        }

        function requireRecord(id: number): DataRecord {
            const record = byId.get(id)
            if (!record) throw new HttpError(404, 'DATA_NOT_FOUND', `${label}不存在`)
            return readRecord(record)
        }

        function recordChange(action: 'create' | 'update' | 'archive', adminId: number, ip: string, before: DataRecord | null, after: DataRecord) {
            function snapshot(record: DataRecord) {
                const { imageObjectKey, teamName, teamStatus, ...fields } = record
                return fields
            }

            const detail = { before: before && snapshot(before), after: snapshot(after) }
            audit.run(adminId, `${entity}.${action}`, entity, after.id, JSON.stringify(detail), ip, after.updatedAt)
        }

        return {
            list() {
                return list.all().map(readRecord)
            },

            save(input: DataInput, actor: AuthorizedActor, id?: number) {
                return writeTransaction(db, () => {
                    const { adminId } = actor.authorize()
                    const before = id === undefined ? null : requireRecord(id)
                    if (before?.status === 'archived' && input.status !== undefined) {
                        throw new HttpError(409, 'DATA_ARCHIVED', `${label}已归档，无法更改启用状态`)
                    }
                    const duplicate = byName.get(input.name)
                    if (duplicate && duplicate.id !== id) {
                        throw new HttpError(409, 'DATA_NAME_EXISTS', `${label}名称已存在`)
                    }

                    const now = new Date().toISOString()
                    const values: (string | number | null)[] = [input.name, input.status ?? before?.status ?? 'active']
                    if (image) {
                        const fileId = input.imageFile ? files.registerUpload(input.imageFile, adminId, now) : before?.imageFileId ?? null
                        values.push(fileId)
                    }
                    if (key === 'drivers') {
                        const previousTeam = before?.teamId ?? null
                        const teamId = input.teamId === undefined ? previousTeam : input.teamId
                        if (teamId !== null && teamId !== previousTeam && teamById.get(teamId)?.status !== 'active') {
                            throw new HttpError(409, 'TEAM_UNAVAILABLE', '车队已不可选，请重新选择')
                        }
                        values.push(teamId)
                    }
                    const recordId = id ?? Number(insert.run(...values, now, now).lastInsertRowid)
                    if (id !== undefined) update.run(...values, now, id)
                    if (key === 'cars') {
                        if (!input.ecu?.length) throw new HttpError(400, 'INVALID_DATA_INPUT', '请填写至少一项 ECU')
                        if (id !== undefined) deleteCarEcus.run(recordId)
                        input.ecu.forEach((name, position) => insertCarEcu.run(recordId, position, name))
                    }
                    const after = requireRecord(recordId)
                    recordChange(id === undefined ? 'create' : 'update', adminId, actor.ip, before, after)
                    return after
                })
            },

            archive(id: number, actor: AuthorizedActor) {
                writeTransaction(db, () => {
                    const { adminId } = actor.authorize()
                    const before = requireRecord(id)
                    if (before.status === 'archived') return

                    archive.run(new Date().toISOString(), id)
                    recordChange('archive', adminId, actor.ip, before, requireRecord(id))
                })
            },
        }
    }

    return {
        resources: {
            teams: createResourceStore('teams'),
            drivers: createResourceStore('drivers'),
            cars: createResourceStore('cars'),
            pets: createResourceStore('pets'),
        },
        listTeamOptions: () => teamOptions.all(),
    }
}
