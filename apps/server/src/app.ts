import Koa from 'koa'
import { handleErrors } from './http/errors.ts'
import { createAuthRoutes } from './modules/auth/auth.routes.ts'
import type { AuthService } from './modules/auth/auth.service.ts'
import { createDataRoutes } from './modules/data/data.routes.ts'
import type { DataStore } from './modules/data/data.store.ts'
import { createRbacRoutes } from './modules/rbac/rbac.routes.ts'
import type { RbacStore } from './modules/rbac/rbac.store.ts'
import { createRecordRoutes } from './modules/records/records.routes.ts'
import type { RecordStore } from './modules/records/records.store.ts'
import { createTrackCoverRoutes } from './modules/tracks/track-cover.routes.ts'
import { createTrackRoutes } from './modules/tracks/tracks.routes.ts'
import type { TrackStore } from './modules/tracks/tracks.store.ts'
import type { CosUploads } from './modules/uploads/cos-uploads.ts'

interface AppOptions {
    auth: AuthService
    rbac: RbacStore
    tracks: TrackStore
    data: DataStore
    records: RecordStore
    cosUploads?: CosUploads
    adminOrigins: ReadonlySet<string>
    trustProxy: boolean
}

export function createApp({ auth, rbac, tracks, data, records, cosUploads, adminOrigins, trustProxy }: AppOptions) {
    const app = new Koa({ proxy: trustProxy, maxIpsCount: 1 })
    app.use(handleErrors)
    app.use(createAuthRoutes(auth, adminOrigins, rbac))
    app.use(createRbacRoutes(rbac, auth))
    app.use(createTrackCoverRoutes(auth, rbac, cosUploads))
    app.use(createTrackRoutes(tracks, auth, rbac, cosUploads))
    app.use(createDataRoutes(data, auth, rbac, cosUploads))
    app.use(createRecordRoutes(records, auth, rbac, cosUploads))

    app.use(ctx => {
        if (ctx.path === '/api/health' && (ctx.method === 'GET' || ctx.method === 'HEAD')) {
            ctx.body = { status: 'ok', timestamp: new Date().toISOString() }
            return
        }

        ctx.status = 404
        ctx.body = { code: 'NOT_FOUND', message: '请求的接口不存在' }
    })

    return app
}
