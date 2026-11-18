import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import type { RbacStore } from '../rbac/rbac.store.ts'
import { parseCredentials } from './auth.service.ts'
import type { AuthService, SessionGrant } from './auth.service.ts'

const authPath = '/api/admin/auth'
const refreshCookieName = 'admin_refresh'

interface AuthEndpoint {
    method: 'POST' | 'GET'
    handle: (ctx: Koa.Context) => void | Promise<void>
}

export function createAuthRoutes(auth: AuthService, allowedOrigins: ReadonlySet<string>, rbac: RbacStore): Koa.Middleware {
    const endpoints: Record<string, AuthEndpoint | undefined> = {
        [`${authPath}/login`]: {
            method: 'POST',
            async handle(ctx) {
                const body = await readJsonObject(ctx)
                const credentials = parseCredentials(body.username, body.password)
                if (!credentials) {
                    throw new HttpError(400, 'INVALID_CREDENTIALS_INPUT', '请输入有效的用户名和密码')
                }

                const result = await auth.login(credentials, ctx.ip)
                if ('code' in result) {
                    if (result.code === 'INVALID_CREDENTIALS') {
                        throw new HttpError(401, result.code, '用户名或密码错误')
                    }
                    ctx.set('Retry-After', String(result.retryAfter))
                    throw new HttpError(429, result.code, '登录尝试过多，请稍后再试')
                }

                sendSession(ctx, result)
            },
        },
        [`${authPath}/refresh`]: {
            method: 'POST',
            handle(ctx) {
                const grant = auth.refresh(readRefreshCookie(ctx))
                if (!grant) throw new HttpError(401, 'INVALID_SESSION', '会话已失效，请重新登录')
                sendSession(ctx, grant)
            },
        },
        [`${authPath}/me`]: {
            method: 'GET',
            handle(ctx) {
                const admin = requireAdmin(ctx, auth)
                ctx.body = { admin, ...rbac.getContext(admin.id) }
            },
        },
        [`${authPath}/logout`]: {
            method: 'POST',
            handle(ctx) {
                auth.logout(readRefreshCookie(ctx), readBearerToken(ctx), ctx.ip)
                setRefreshCookie(ctx, null)
                ctx.status = 204
            },
        },
    }

    return async (ctx, next) => {
        const endpoint = endpoints[ctx.path]
        if (!endpoint) return next()

        ctx.set('Cache-Control', 'no-store')
        if (ctx.method !== endpoint.method) {
            ctx.set('Allow', endpoint.method)
            throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
        }
        if (endpoint.method === 'POST') validateWriteOrigin(ctx, allowedOrigins)
        await endpoint.handle(ctx)
    }
}

export function requireAdmin(ctx: Koa.Context, auth: AuthService) {
    const admin = auth.getAdmin(readBearerToken(ctx))
    if (!admin) {
        ctx.set('WWW-Authenticate', 'Bearer')
        throw new HttpError(401, 'INVALID_SESSION', '会话已失效，请重新登录')
    }
    return admin
}

function validateWriteOrigin(ctx: Koa.Context, allowedOrigins: ReadonlySet<string>): void {
    const origin = ctx.get('origin') || URL.parse(ctx.get('referer'))?.origin
    if (!origin || !allowedOrigins.has(origin)) {
        throw new HttpError(403, 'INVALID_ORIGIN', '请求来源不受信任')
    }
    if (origin.startsWith('https://') && !ctx.secure) {
        throw new HttpError(403, 'HTTPS_REQUIRED', '认证写请求需要 HTTPS')
    }
}

function readBearerToken(ctx: Koa.Context): string | undefined {
    return /^Bearer +(\S+)$/i.exec(ctx.get('authorization'))?.[1]
}

function readRefreshCookie(ctx: Koa.Context): string | undefined {
    return ctx.cookies.get(refreshCookieName, { signed: false })
}

function setRefreshCookie(ctx: Koa.Context, token: string | null, expires?: Date): void {
    ctx.cookies.set(refreshCookieName, token, {
        path: authPath,
        httpOnly: true,
        sameSite: 'lax',
        secure: ctx.secure,
        signed: false,
        overwrite: true,
        expires,
    })
}

function sendSession(ctx: Koa.Context, { refreshToken, ...body }: SessionGrant): void {
    setRefreshCookie(ctx, refreshToken, new Date(body.refreshExpiresAt))
    ctx.body = body
}
