import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import type { CosUploads } from '../uploads/cos-uploads.ts'
import { recordHoldingMs, type PublicStore, type TrackRow, type VersionedRunRow } from './public.store.ts'

const recordsPath = '/api/public/records'
const allRecordsPath = `${recordsPath}/all`
const rankingsPath = '/api/public/rankings'
const trackPath = /^\/api\/public\/tracks\/([^/]+)$/
const millisecondsPerDay = 86_400_000

function invalid(message: string): never {
    throw new HttpError(400, 'INVALID_PUBLIC_QUERY', message)
}

function positiveInteger(value: unknown, label: string) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        invalid(`${label}无效`)
    }
    return Number(value)
}

function identity(id: number | null, name: string | null) {
    return id !== null && name !== null ? { id, name } : null
}

export function createPublicRoutes(store: PublicStore, uploads?: CosUploads): Koa.Middleware {
    function imageUrl(key: string | null) {
        return key ? uploads?.publicUrl(key) ?? null : null
    }

    function presentTrack(row: TrackRow) {
        return { id: row.trackId, name: row.trackName, stars: row.stars, status: row.status, coverUrl: imageUrl(row.coverObjectKey) }
    }

    function presentVersion(row: VersionedRunRow, holdingMs: number) {
        return {
            id: row.runId,
            versionId: row.versionId,
            kind: row.kind,
            timeMs: row.timeMs,
            achievedAt: row.achievedAt,
            effectiveAt: row.effectiveAt,
            holdingMs,
            holdingDays: Math.floor(holdingMs / millisecondsPerDay),
            driver: { id: row.driverId, name: row.driverName, imageUrl: imageUrl(row.driverImageKey) },
            team: identity(row.teamId, row.teamName),
            car: identity(row.carId, row.carName),
            pet: identity(row.petId, row.petName),
            screenshotUrl: imageUrl(row.screenshotObjectKey),
            videoUrl: row.videoUrl,
        }
    }

    function presentRecords(rows: ReturnType<PublicStore['listAll']>) {
        const now = Date.now()
        return rows.map(row => ({
            track: presentTrack(row),
            current: presentVersion(row, recordHoldingMs(row.achievedAt, now)),
        }))
    }

    return async (ctx, next) => {
        const trackParams = trackPath.exec(ctx.path)
        if (ctx.path !== recordsPath && ctx.path !== allRecordsPath && ctx.path !== rankingsPath && !trackParams) return next()

        ctx.set('Cache-Control', 'no-store')
        if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
            ctx.set('Allow', 'GET, HEAD')
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '不支持该请求方法')
        }

        if (ctx.path === allRecordsPath) {
            ctx.body = { items: presentRecords(store.listAll()) }
            return
        }

        if (ctx.path === recordsPath) {
            const { q = '', stars, sort = 'holding', page = '1' } = ctx.query
            if (typeof q !== 'string' || q.length > 100) invalid('搜索关键词最多 100 字')
            if (stars !== undefined && (typeof stars !== 'string' || !/^[1-7]$/.test(stars))) invalid('星级无效')
            if (sort !== 'holding' && sort !== 'recent') invalid('排序方式无效')
            const result = store.list({ keyword: q, stars: stars === undefined ? null : Number(stars), sort, page: positiveInteger(page, '页码') })
            ctx.body = { ...result, items: presentRecords(result.items) }
            return
        }

        if (ctx.path === rankingsPath) {
            const { category } = ctx.query
            if (category !== 'driver' && category !== 'car' && category !== 'pet') invalid('排行分类无效')
            const items = store.rankings(category).map((row, index) => ({
                id: row.id,
                name: row.name,
                category,
                imageUrl: imageUrl(row.imageObjectKey),
                team: identity(row.teamId, row.teamName),
                nationalRecordCount: row.nationalRecordCount,
                rank: index + 1,
            }))
            ctx.body = { items, total: items.length }
            return
        }

        const { track, current, history, stats } = store.track(positiveInteger(trackParams?.[1], '赛道 ID'))
        ctx.body = {
            track: presentTrack(track),
            current: current && presentVersion(current, stats.currentHoldingMs),
            history: history.map(({ version, endedAt, holdingMs }) => ({
                ...presentVersion(version, holdingMs),
                endedAt,
                voidReason: version.voidReason,
                state: version.voidedAt !== null ? 'voided' : version.versionId === current?.versionId ? 'current' : 'historical',
            })),
            stats,
        }
    }
}
