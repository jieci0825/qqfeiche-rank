import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'
import { confirmImageUpload, signImageUpload, type ImageUploadPurpose } from '../uploads/image-uploads.ts'

const signPath = '/api/admin/tracks/cover/upload'
const coverPurpose: ImageUploadPurpose = { directory: 'tracks/covers', label: '封面', errorPrefix: 'COVER' }

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
        ctx.body = await signImageUpload(ctx, id, coverPurpose, uploads)
    }
}

export function confirmTrackCover(ticket: unknown, adminId: number, uploads?: CosUploads) {
    return confirmImageUpload(ticket, adminId, coverPurpose, uploads)
}
