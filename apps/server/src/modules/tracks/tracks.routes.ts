import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { PermissionCode } from '../rbac/rbac.catalog.ts'
import { permissionActor } from '../rbac/rbac.guard.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'
import { confirmTrackCover } from './track-cover.routes.ts'
import type { TrackStore, TrackWithCover } from './tracks.store.ts'

const tracksPath = '/api/admin/tracks'
const trackPath = /^\/api\/admin\/tracks\/([1-9]\d*)(\/archive)?$/

export function createTrackRoutes(tracks: TrackStore, auth: AuthService, rbac: RbacStore, uploads?: CosUploads): Koa.Middleware {
    function presentTrack({ coverObjectKey, ...track }: TrackWithCover) {
        return {
            ...track,
            coverUrl: coverObjectKey === null ? null : uploads?.publicUrl(coverObjectKey) ?? null,
        }
    }

    return async (ctx, next) => {
        const isCollection = ctx.path === tracksPath
        const match = trackPath.exec(ctx.path)
        if (!isCollection && !match) return next()

        ctx.set('Cache-Control', 'no-store')

        const allowed = isCollection ? ['GET', 'POST'] : [match?.[2] ? 'POST' : 'PUT']
        if (!allowed.includes(ctx.method)) {
            requireAdmin(ctx, auth)
            ctx.set('Allow', allowed.join(', '))
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
        }

        const permission = trackPermission(ctx.method, Boolean(match?.[2]))
        const actor = permissionActor(ctx, auth, rbac, permission)
        const { adminId } = actor.authorize()

        if (ctx.method === 'GET') {
            ctx.body = { tracks: tracks.list().map(presentTrack) }
            return
        }

        const id = match ? Number(match[1]) : undefined
        if (id !== undefined && !Number.isSafeInteger(id)) {
            throw new HttpError(404, 'TRACK_NOT_FOUND', '赛道不存在')
        }

        if (id !== undefined && match?.[2]) {
            tracks.archive(id, actor)
            ctx.status = 204
            return
        }

        const { coverUploadTicket, ...input } = parseTrack(await readJsonObject(ctx))
        const coverFile = typeof coverUploadTicket === 'string'
            ? await confirmTrackCover(coverUploadTicket, adminId, uploads)
            : coverUploadTicket
        ctx.body = { track: presentTrack(tracks.save({ ...input, coverFile }, actor, id)) }
        ctx.status = isCollection ? 201 : 200
    }
}

function trackPermission(method: string, isArchive: boolean): PermissionCode {
    if (method === 'GET') return 'tracks:read'
    if (method === 'PUT') return 'tracks:update'
    return isArchive ? 'tracks:archive' : 'tracks:create'
}

function parseTrack(body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 100) {
        throw new HttpError(400, 'INVALID_TRACK_INPUT', '请输入 1 至 100 字的赛道名称')
    }

    const sortOrder = body.sortOrder
    if (typeof sortOrder !== 'number' || !Number.isSafeInteger(sortOrder)) {
        throw new HttpError(400, 'INVALID_TRACK_INPUT', '排序值必须是有效整数')
    }

    const { coverUploadTicket } = body
    if ('coverUrl' in body || (coverUploadTicket != null && typeof coverUploadTicket !== 'string')) {
        throw new HttpError(400, 'INVALID_TRACK_INPUT', '封面须通过图片上传设置')
    }

    return { name, sortOrder, coverUploadTicket, description: optionalText(body.description, 1000, '描述') }
}

function optionalText(input: unknown, maxLength: number, label: string) {
    if (input == null) return null
    if (typeof input !== 'string' || input.trim().length > maxLength) {
        throw new HttpError(400, 'INVALID_TRACK_INPUT', `${label}不能超过 ${maxLength} 字`)
    }
    return input.trim() || null
}
