import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { HttpError } from '../../http/errors.ts'
import { createFileStore, type UploadedFile } from '../files/files.store.ts'
import type { AuthorizedActor } from '../rbac/rbac.store.ts'

export interface TrackInput {
    name: string
    coverFile?: UploadedFile | null
    description: string | null
    sortOrder: number
}

interface Track extends Omit<TrackInput, 'coverFile'> {
    id: number
    coverFileId: number | null
    status: 'active' | 'archived'
    createdAt: string
    updatedAt: string
}

export interface TrackWithCover extends Track {
    coverObjectKey: string | null
}

interface TrackActor {
    adminId: number
    ip: string
}

export type TrackStore = ReturnType<typeof createTrackStore>

const columns = `id, name, cover_file_id AS coverFileId, description, status,
    sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt`
const selectWithCover = `
    SELECT track.*, files.object_key AS coverObjectKey
    FROM (SELECT ${columns} FROM tracks) AS track
    LEFT JOIN files ON files.id = track.coverFileId
`

export function createTrackStore(db: DatabaseSync) {
    const files = createFileStore(db)
    const list = db.prepare(`${selectWithCover} ORDER BY track.sortOrder, track.name, track.id`)
    const byId = db.prepare(`SELECT ${columns} FROM tracks WHERE id = ?`)
    const byIdWithCover = db.prepare(`${selectWithCover} WHERE track.id = ?`)
    const byName = db.prepare('SELECT id FROM tracks WHERE name = ?')
    const insert = db.prepare(`
        INSERT INTO tracks (name, cover_file_id, description, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?) RETURNING ${columns}
    `)
    const update = db.prepare(`
        UPDATE tracks SET name = ?, cover_file_id = ?, description = ?, sort_order = ?, updated_at = ?
        WHERE id = ? RETURNING ${columns}
    `)
    const archive = db.prepare(`
        UPDATE tracks SET status = 'archived', updated_at = ? WHERE id = ? RETURNING ${columns}
    `)
    const audit = db.prepare(`
        INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, ip, created_at)
        VALUES (?, ?, 'track', ?, ?, ?, ?)
    `)

    function requireTrack(id: number) {
        const track = byId.get(id) as unknown as Track | undefined
        if (!track) throw new HttpError(404, 'TRACK_NOT_FOUND', '赛道不存在')
        return track
    }

    function recordChange(
        action: 'track.create' | 'track.update' | 'track.archive',
        actor: TrackActor,
        before: Track | null,
        after: Track,
    ) {
        audit.run(actor.adminId, action, after.id, JSON.stringify({ before, after }), actor.ip, after.updatedAt)
    }

    return {
        list() {
            return list.all() as unknown as TrackWithCover[]
        },

        save(input: TrackInput, actor: AuthorizedActor, id?: number) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                const before = id === undefined ? null : requireTrack(id)
                const existing = byName.get(input.name)
                if (existing && existing.id !== id) {
                    throw new HttpError(409, 'TRACK_NAME_EXISTS', '赛道名称已存在')
                }

                const { name, coverFile, description, sortOrder } = input
                const now = new Date().toISOString()
                const coverFileId = coverFile === undefined
                    ? before?.coverFileId ?? null
                    : coverFile && files.registerUpload(coverFile, adminId, now)
                const after = (id === undefined
                    ? insert.get(name, coverFileId, description, sortOrder, now, now)
                    : update.get(name, coverFileId, description, sortOrder, now, id)) as unknown as Track
                recordChange(id === undefined ? 'track.create' : 'track.update', { adminId, ip: actor.ip }, before, after)
                return byIdWithCover.get(after.id) as unknown as TrackWithCover
            })
        },

        archive(id: number, actor: AuthorizedActor) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                const before = requireTrack(id)
                if (before.status === 'archived') return

                const after = archive.get(new Date().toISOString(), id) as unknown as Track
                recordChange('track.archive', { adminId, ip: actor.ip }, before, after)
            })
        },
    }
}
