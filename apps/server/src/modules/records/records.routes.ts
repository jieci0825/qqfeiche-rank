import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { PermissionCode } from '../rbac/rbac.catalog.ts'
import { permissionActor } from '../rbac/rbac.guard.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'
import { confirmImageUpload, signImageUpload } from '../uploads/image-uploads.ts'
import { millisecondsPerDay, recordHoldingMs } from './record-queries.ts'
import { voidReasons, type ListedRecord, type ListedRecordTrack, type RecordInput, type RecordMetadata, type RecordStore } from './records.store.ts'

const basePath = '/api/admin/records'
const resourcePath = /^\/([1-9]\d*)(?:\/(void-preview|void))?$/
const trackRunsPath = /^\/tracks\/([1-9]\d*)\/runs$/
const screenshotPurpose = { directory: 'records/screenshots', label: '成绩截图' }

export function createRecordRoutes(records: RecordStore, auth: AuthService, rbac: RbacStore, uploads?: CosUploads): Koa.Middleware {
    function imageUrl(objectKey: string | null) {
        return objectKey ? uploads?.publicUrl(objectKey) ?? null : null
    }

    function presentRecord<T extends ListedRecord>({ screenshotObjectKey, trackCoverObjectKey, ...record }: T) {
        return {
            ...record,
            screenshotUrl: imageUrl(screenshotObjectKey),
            trackCoverUrl: imageUrl(trackCoverObjectKey),
        }
    }

    function presentTrack(row: ListedRecordTrack, now: number) {
        return {
            id: row.trackId,
            name: row.trackName,
            status: row.status,
            coverUrl: imageUrl(row.coverObjectKey),
            current: row.runId === null ? null : {
                id: row.runId, timeMs: row.timeMs, driverName: row.driverName, teamName: row.teamName,
                achievedAt: row.achievedAt, holdingDays: Math.floor(recordHoldingMs(row.achievedAt, now) / millisecondsPerDay),
            },
        }
    }

    return async (ctx, next) => {
        if (ctx.path !== basePath && !ctx.path.startsWith(`${basePath}/`)) return next()
        const path = ctx.path.slice(basePath.length)
        const resource = resourcePath.exec(path)
        const trackRuns = trackRunsPath.exec(path)
        const action = resource?.[2]
        const methods = !path || trackRuns ? ['GET', 'POST']
            : path === '/options' || path === '/current' || action === 'void-preview' ? ['GET']
                : path === '/screenshot/upload' || action === 'void' ? ['POST'] : resource ? ['GET', 'PUT'] : []
        if (!methods.length) return next()
        ctx.set('Cache-Control', 'no-store')
        if (!methods.includes(ctx.method)) {
            requireAdmin(ctx, auth)
            ctx.set('Allow', methods.join(', '))
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
        }

        if (path === '/options' || path === '/current' || path === '/screenshot/upload') {
            const { id } = requireAdmin(ctx, auth)
            switch (path) {
                case '/options': {
                    rbac.requirePermission(id, 'records:create', 'records:update')
                    const { tracks, ...options } = records.options()
                    ctx.body = {
                        ...options,
                        tracks: tracks.map(({ coverObjectKey, ...track }) => ({ ...track, coverUrl: imageUrl(coverObjectKey) })),
                    }
                    return
                }
                case '/current':
                    rbac.requirePermission(id, 'records:read', 'records:create')
                    if (typeof ctx.query.trackId !== 'string' || !/^[1-9]\d*$/.test(ctx.query.trackId)) invalid('请选择有效的赛道')
                    ctx.body = { current: records.current(requiredId(Number(ctx.query.trackId), '赛道')) }
                    return
                default:
                    rbac.requirePermission(id, 'records:create', 'records:update')
                    ctx.body = await signImageUpload(ctx, id, screenshotPurpose, uploads)
                    return
            }
        }

        const permission: PermissionCode = action ? 'records:void' : ctx.method === 'GET' ? 'records:read'
            : ctx.method === 'PUT' ? 'records:update' : 'records:create'
        const actor = permissionActor(ctx, auth, rbac, permission)
        const { adminId } = actor.authorize()
        const id = resource ? Number(resource[1]) : undefined
        const trackId = trackRuns ? requiredId(Number(trackRuns[1]), '赛道') : undefined
        if (id !== undefined && !Number.isSafeInteger(id)) throw new HttpError(404, 'RECORD_NOT_FOUND', '成绩不存在')

        if (id !== undefined && action === 'void-preview') {
            ctx.body = records.previewVoid(id)
            return
        }
        if (id !== undefined && action === 'void') {
            const result = records.void(id, parseVoid(await readJsonObject(ctx)), actor)
            ctx.body = { ...result, record: presentRecord(result.record) }
            return
        }
        if (ctx.method === 'GET') {
            if (id !== undefined) {
                ctx.body = { record: presentRecord(records.detail(id)) }
                return
            }
            if (trackId !== undefined) {
                ctx.body = { items: records.trackRuns(trackId).map(presentRecord) }
                return
            }
            const { q, state = 'all', page = '1', pageSize = '20' } = ctx.query
            if (state !== 'all' && state !== 'current' && state !== 'empty') {
                invalid('赛道记录状态无效')
            }
            if (q !== undefined && (typeof q !== 'string' || q.length > 100)) invalid('搜索关键词最多 100 字')
            const result = records.list(q?.trim().toLowerCase() ?? '', state, pageNumber(page), pageNumber(pageSize, 100))
            const now = Date.now()
            ctx.body = { ...result, items: result.items.map(row => presentTrack(row, now)) }
            return
        }

        const body = await readJsonObject(ctx)
        const { screenshotUploadTicket, ...metadata } = parseMetadata(body)
        const input = id === undefined ? parseCreate(body, trackId) : undefined
        if (id !== undefined && ('trackId' in body || 'timeMs' in body || 'achievedAt' in body)) {
            invalid('赛道、成绩和达成日期录入后不可修改')
        }
        const screenshotFile = typeof screenshotUploadTicket === 'string'
            ? await confirmImageUpload(screenshotUploadTicket, adminId, screenshotPurpose, uploads)
            : screenshotUploadTicket
        const record = input
            ? records.create({ ...metadata, ...input, screenshotFile }, trackId === undefined ? 'first' : 'next', actor)
            : records.update(id!, { ...metadata, screenshotFile }, actor)
        ctx.body = { record: presentRecord(record) }
        ctx.status = input ? 201 : 200
    }
}

function invalid(message: string): never {
    throw new HttpError(400, 'INVALID_RECORD_INPUT', message)
}

function requiredId(value: unknown, label: string) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid(`请选择有效的${label}`)
    return value
}

function optionalId(value: unknown, label: string) {
    return value == null ? null : requiredId(value, label)
}

function pageNumber(value: unknown, max = Number.MAX_SAFE_INTEGER) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > max) invalid('分页参数无效')
    return Number(value)
}

function optionalText(value: unknown, label: string, max = 500) {
    if (value == null) return null
    if (typeof value !== 'string' || value.length > max || value.includes('\0')) invalid(`${label}最多 ${max} 字`)
    return value.trim() || null
}

function parseMetadata(body: Record<string, unknown>): Omit<RecordMetadata, 'screenshotFile'> & { screenshotUploadTicket?: string | null } {
    const { screenshotUploadTicket } = body
    if ('screenshotFileId' in body || 'screenshotUrl' in body ||
        (screenshotUploadTicket != null && (typeof screenshotUploadTicket !== 'string' || !screenshotUploadTicket))) {
        invalid('截图须通过图片上传设置')
    }
    const videoUrl = optionalText(body.videoUrl, '视频地址')
    if (videoUrl) {
        const url = URL.parse(videoUrl)
        if (!url || !/^https?:\/\//i.test(videoUrl) || url.username || url.password) invalid('请输入有效的 HTTP 或 HTTPS 视频地址')
    }
    const rawEcu = body.ecu ?? []
    if (!Array.isArray(rawEcu)) invalid('请选择或填写有效的 ECU 名称')
    const ecu = rawEcu.map((value: unknown) => {
        const name = optionalText(value, 'ECU 名称', 100)
        if (!name) invalid('ECU 名称不能为空')
        return name
    })
    return {
        driverId: requiredId(body.driverId, '车手'), teamId: optionalId(body.teamId, '车队'),
        carId: optionalId(body.carId, '赛车'), petId: optionalId(body.petId, '宠物'), ecu,
        videoUrl, note: optionalText(body.note, '备注'), screenshotUploadTicket,
    }
}

function parseCreate(body: Record<string, unknown>, trackId?: number): Pick<RecordInput, 'trackId' | 'timeMs' | 'achievedAt'> {
    if (trackId !== undefined && 'trackId' in body) invalid('请在赛道对应的入口录入新纪录')
    const { timeMs, achievedAt } = body
    if (typeof timeMs !== 'number' || !Number.isInteger(timeMs) || timeMs < 1 || timeMs >= 6000000) {
        invalid('成绩必须大于 0 且小于 100 分钟')
    }
    if (timeMs % 10 !== 0) invalid('成绩的秒数最多保留两位小数')
    if (typeof achievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(achievedAt)) {
        invalid('请输入有效的达成日期')
    }
    const date = new Date(achievedAt)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== achievedAt) {
        invalid('请输入有效的达成日期')
    }
    return { trackId: trackId ?? requiredId(body.trackId, '赛道'), timeMs, achievedAt }
}

function parseVoid(body: Record<string, unknown>): Parameters<RecordStore['void']>[1] {
    const reason = voidReasons.find(value => value === body.reason)
    if (!reason) invalid('请选择作废原因')
    const note = optionalText(body.note, '作废说明')
    if (reason === 'other' && !note) invalid('请选择具体原因或填写作废说明')
    if (!('currentVersionId' in body) || !('recoveryVersionId' in body)) invalid('请先查看作废影响')
    return {
        reason, note, currentVersionId: optionalId(body.currentVersionId, '当前版本'),
        recoveryVersionId: optionalId(body.recoveryVersionId, '回退版本'),
    }
}
