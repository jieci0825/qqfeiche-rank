import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import { permissionActor } from '../rbac/rbac.guard.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'
import { confirmImageUpload, signImageUpload } from '../uploads/image-uploads.ts'
import { dataResources, type DataResource, type DataResourceKey } from './data.resources.ts'
import type { DataInput, DataRecord, DataStore } from './data.store.ts'

const dataPath = /^\/api\/admin\/(teams|drivers|cars|pets)(?:\/(team-options|image\/upload|([1-9]\d*)(\/archive)?))?$/

export function createDataRoutes(data: DataStore, auth: AuthService, rbac: RbacStore, uploads?: CosUploads): Koa.Middleware {
    function presentRecord({ imageObjectKey, ...record }: DataRecord) {
        return imageObjectKey === undefined
            ? record
            : { ...record, imageUrl: imageObjectKey === null ? null : uploads?.publicUrl(imageObjectKey) ?? null }
    }

    return async (ctx, next) => {
        const match = dataPath.exec(ctx.path)
        if (!match) return next()

        const key = match[1] as DataResourceKey
        const { label, image }: DataResource = dataResources[key]
        const resource = data.resources[key]
        const [, , endpoint, rawId, archive] = match
        const teamOptions = endpoint === 'team-options'
        const imageUpload = endpoint === 'image/upload'
        if ((teamOptions && key !== 'drivers') || (imageUpload && !image)) return next()

        ctx.set('Cache-Control', 'no-store')
        const allowed = teamOptions ? ['GET'] : !endpoint ? ['GET', 'POST'] : archive || imageUpload ? ['POST'] : ['PUT']
        if (!allowed.includes(ctx.method)) {
            requireAdmin(ctx, auth)
            ctx.set('Allow', allowed.join(', '))
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
        }

        if (teamOptions) {
            const { id } = requireAdmin(ctx, auth)
            rbac.requirePermission(id, 'drivers:create', 'drivers:update')
            ctx.body = { teams: data.listTeamOptions() }
            return
        }
        if (imageUpload && image) {
            const { id } = requireAdmin(ctx, auth)
            rbac.requirePermission(id, `${key}:create`, `${key}:update`)
            ctx.body = await signImageUpload(ctx, id, image, uploads)
            return
        }

        const action = ctx.method === 'GET' ? 'read' : ctx.method === 'PUT' ? 'update' : archive ? 'archive' : 'create'
        const actor = permissionActor(ctx, auth, rbac, `${key}:${action}`)
        const { adminId } = actor.authorize()
        if (action === 'read') {
            ctx.body = { items: resource.list().map(presentRecord) }
            return
        }

        const id = rawId === undefined ? undefined : Number(rawId)
        if (id !== undefined && !Number.isSafeInteger(id)) {
            throw new HttpError(404, 'DATA_NOT_FOUND', `${label}不存在`)
        }
        if (archive && id !== undefined) {
            resource.archive(id, actor)
            ctx.status = 204
            return
        }

        const body = await readJsonObject(ctx)
        const { imageUploadTicket, ...input } = parseDataInput(key, body)
        const imageFile = image && imageUploadTicket !== undefined
            ? await confirmImageUpload(imageUploadTicket, adminId, image, uploads)
            : undefined
        ctx.body = { item: presentRecord(resource.save({ ...input, imageFile }, actor, id)) }
        ctx.status = action === 'create' ? 201 : 200
    }
}

function parseDataInput(key: DataResourceKey, body: Record<string, unknown>): DataInput & { imageUploadTicket?: string } {
    const { label, image }: DataResource = dataResources[key]
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 100) {
        throw new HttpError(400, 'INVALID_DATA_INPUT', `请输入 1 至 100 字的${label}名称`)
    }

    const { status, imageUploadTicket } = body
    if (status !== undefined && status !== 'active' && status !== 'disabled') {
        throw new HttpError(400, 'INVALID_DATA_INPUT', `${label}状态只能设置为启用或禁用`)
    }
    if (image && ('imageUrl' in body || 'imageFileId' in body ||
        (imageUploadTicket !== undefined && (typeof imageUploadTicket !== 'string' || !imageUploadTicket)))) {
        throw new HttpError(400, 'INVALID_DATA_INPUT', `${image.label}须通过图片上传设置`)
    }

    const teamId = key === 'drivers' ? body.teamId : undefined
    if (teamId !== undefined && teamId !== null && (typeof teamId !== 'number' || !Number.isSafeInteger(teamId) || teamId < 1)) {
        throw new HttpError(400, 'INVALID_DATA_INPUT', '请选择有效的车队')
    }

    let ecu: string[] | undefined
    if (key === 'cars') {
        if (!Array.isArray(body.ecu) || !body.ecu.length) {
            throw new HttpError(400, 'INVALID_DATA_INPUT', '请填写至少一项 ECU')
        }
        ecu = body.ecu.map((value: unknown) => {
            const name = typeof value === 'string' ? value.trim() : ''
            if (!name || name.length > 100 || name.includes('\0')) {
                throw new HttpError(400, 'INVALID_DATA_INPUT', '每项 ECU 名称须为 1 至 100 字的有效文本')
            }
            return name
        })
    }
    return { name, status, teamId, ecu, imageUploadTicket: typeof imageUploadTicket === 'string' ? imageUploadTicket : undefined }
}
