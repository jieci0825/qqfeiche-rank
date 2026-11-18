import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { HttpError } from '../../http/errors.ts'
import type { AuthorizedActor } from '../rbac/rbac.store.ts'

export interface TrackInput {
    name: string
    coverUrl: string | null
    description: string | null
    sortOrder: number
}

interface Track extends TrackInput {
    id: number
    status: 'active' | 'archived'
    createdAt: string
    updatedAt: string
}

interface TrackActor {
    adminId: number
    ip: string
}

export type TrackStore = ReturnType<typeof createTrackStore>

const columns = `id, name, cover_url AS coverUrl, description, status,
    sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt`

export function createTrackStore(db: DatabaseSync) {
    const list = db.prepare(`SELECT ${columns} FROM tracks ORDER BY sort_order, name, id`)
    const byId = db.prepare(`SELECT ${columns} FROM tracks WHERE id = ?`)
    const byName = db.prepare('SELECT id FROM tracks WHERE name = ?')
    const insert = db.prepare(`
        INSERT INTO tracks (name, cover_url, description, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?) RETURNING ${columns}
    `)
    const update = db.prepare(`
        UPDATE tracks SET name = ?, cover_url = ?, description = ?, sort_order = ?, updated_at = ?
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
            return list.all() as unknown as Track[]
        },

        save(input: TrackInput, actor: AuthorizedActor, id?: number) {
            return writeTransaction(db, () => {
                const { adminId } = actor.authorize()
                const before = id === undefined ? null : requireTrack(id)
                const existing = byName.get(input.name)
                if (existing && existing.id !== id) {
                    throw new HttpError(409, 'TRACK_NAME_EXISTS', '赛道名称已存在')
                }

                const { name, coverUrl, description, sortOrder } = input
                const now = new Date().toISOString()
                const after = (id === undefined
                    ? insert.get(name, coverUrl, description, sortOrder, now, now)
                    : update.get(name, coverUrl, description, sortOrder, now, id)) as unknown as Track
                recordChange(id === undefined ? 'track.create' : 'track.update', { adminId, ip: actor.ip }, before, after)
                return after
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
