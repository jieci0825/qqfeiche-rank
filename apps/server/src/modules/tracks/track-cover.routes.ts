import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'

const signPath = '/api/admin/tracks/cover/upload'
const directory = 'tracks/covers'
const maxCoverBytes = 5 * 1024 * 1024
const coverExtensions = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
])
const jpegHeader = Buffer.from('ffd8ff', 'hex')
const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex')

export function createTrackCoverRoutes(auth: AuthService, rbac: RbacStore, uploads?: CosUploads): Koa.Middleware {
    return async (ctx, next) => {
        if (ctx.path !== signPath) return next()

        ctx.set('Cache-Control', 'no-store')
        const { id } = requireAdmin(ctx, auth)
        if (ctx.method !== 'POST') {
            ctx.set('Allow', 'POST')
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
        }
        rbac.requirePermission(id, 'tracks:create', 'tracks:update')
        if (!uploads) throw new HttpError(503, 'COS_NOT_CONFIGURED', '封面上传服务尚未配置')

        const body = await readJsonObject(ctx)
        const { size, originalName } = body
        if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1 || size > maxCoverBytes) {
            throw new HttpError(400, 'INVALID_COVER_SIZE', '封面须大于 0 字节且不超过 5 MB')
        }
        const contentType = typeof body.contentType === 'string' ? body.contentType : ''
        const extension = coverExtensions.get(contentType)
        if (!extension) {
            throw new HttpError(400, 'INVALID_COVER_TYPE', '请选择 JPEG、PNG 或 WebP 图片')
        }
        if (
            originalName !== undefined &&
            (typeof originalName !== 'string' || !originalName.trim() || originalName.length > 255 ||
                /[\u0000\r\n]/.test(originalName))
        ) {
            throw new HttpError(400, 'INVALID_COVER_NAME', '文件名须为 1 至 255 个字符且不能包含换行')
        }
        ctx.body = uploads.signUpload(directory, id, { contentType, extension, size, originalName: originalName ?? null })
    }
}

export async function confirmTrackCover(ticket: unknown, adminId: number, uploads?: CosUploads) {
    if (!uploads) throw new HttpError(503, 'COS_NOT_CONFIGURED', '封面上传服务尚未配置')

    const { header, file } = await uploads.readUploadHeader(directory, adminId, ticket, 12)
    if (!matchesImageHeader(header, file.contentType)) {
        throw new HttpError(422, 'INVALID_COVER_CONTENT', '文件内容与所选图片格式不符')
    }
    return file
}

function matchesImageHeader(header: Buffer, contentType: string): boolean {
    if (contentType === 'image/jpeg') return header.subarray(0, jpegHeader.length).equals(jpegHeader)
    if (contentType === 'image/png') return header.subarray(0, pngHeader.length).equals(pngHeader)
    return contentType === 'image/webp' && header.toString('latin1', 0, 4) === 'RIFF' &&
        header.toString('latin1', 8, 12) === 'WEBP'
}
