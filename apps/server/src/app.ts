import Koa from 'koa'
import { handleErrors } from './http/errors.ts'
import { createAuthRoutes } from './modules/auth/auth.routes.ts'
import type { AuthService } from './modules/auth/auth.service.ts'
import { createTrackRoutes } from './modules/tracks/tracks.routes.ts'
import type { TrackStore } from './modules/tracks/tracks.store.ts'

interface AppOptions {
    auth: AuthService
    tracks: TrackStore
    adminOrigins: ReadonlySet<string>
    trustProxy: boolean
}

export function createApp({ auth, tracks, adminOrigins, trustProxy }: AppOptions) {
    const app = new Koa({ proxy: trustProxy, maxIpsCount: 1 })
    app.use(handleErrors)
    app.use(createAuthRoutes(auth, adminOrigins))
    app.use(createTrackRoutes(tracks, auth))

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
