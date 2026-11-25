import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultDatabasePath = fileURLToPath(new URL('../data/qqfeiche.sqlite', import.meta.url))
const developmentOrigins = ['http://localhost:9432', 'http://127.0.0.1:9432']

export interface CosConfig {
    secretId: string
    secretKey: string
    bucket: string
    region: string
    publicBaseUrl: string
}

export function loadConfig(env: NodeJS.ProcessEnv) {
    const port = Number(env.PORT ?? '9433')
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT 必须是 1 到 65535 之间的整数')
    }

    const production = env.NODE_ENV === 'production'
    const adminOrigin = env.ADMIN_ORIGIN ? parseAdminOrigin(env.ADMIN_ORIGIN) : undefined
    if (production && !adminOrigin) {
        throw new Error('生产环境必须配置 ADMIN_ORIGIN')
    }
    if (production && adminOrigin?.startsWith('http://') && env.ALLOW_HTTP_ADMIN_ORIGIN !== '1') {
        throw new Error('生产环境使用 HTTP 的 ADMIN_ORIGIN 时必须设置 ALLOW_HTTP_ADMIN_ORIGIN=1')
    }

    const databasePath = env.DATABASE_PATH || defaultDatabasePath
    return {
        host: env.HOST || '127.0.0.1',
        port,
        trustProxy: env.TRUST_PROXY === '1',
        adminOrigins: new Set(adminOrigin ? [adminOrigin] : developmentOrigins),
        databasePath: databasePath === ':memory:' ? databasePath : resolve(databasePath),
        adminUsername: env.ADMIN_USERNAME,
        adminPassword: env.ADMIN_PASSWORD,
        cos: loadCosConfig(env),
    }
}

export function loadCosConfig(env: NodeJS.ProcessEnv): CosConfig | undefined {
    const secretId = env.COS_SECRET_ID?.trim()
    const secretKey = env.COS_SECRET_KEY?.trim()
    const bucket = env.COS_BUCKET?.trim()
    const region = env.COS_REGION?.trim()
    const baseUrl = env.COS_PUBLIC_BASE_URL?.trim()
    if (!secretId && !secretKey && !bucket && !region && !baseUrl) return
    if (!secretId || !secretKey || !bucket || !region || !baseUrl) {
        throw new Error('请完整配置 COS_SECRET_ID、COS_SECRET_KEY、COS_BUCKET、COS_REGION 和 COS_PUBLIC_BASE_URL')
    }
    if (bucket.length > 63 || !/^[a-z0-9][a-z0-9-]*-\d+$/.test(bucket)) {
        throw new Error('COS_BUCKET 必须使用包含 APPID 的完整桶名')
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(region)) {
        throw new Error('COS_REGION 必须使用地域简称，例如 ap-guangzhou')
    }
    const publicUrl = URL.parse(baseUrl)
    if (
        !publicUrl || !['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password ||
        publicUrl.search || publicUrl.hash || publicUrl.href.length > 1400
    ) {
        throw new Error('COS_PUBLIC_BASE_URL 必须是有效的 HTTP(S) 资源基础地址')
    }
    publicUrl.pathname = publicUrl.pathname.replace(/\/+$/, '') + '/'
    return { secretId, secretKey, bucket, region, publicBaseUrl: publicUrl.href }
}

function parseAdminOrigin(value: string): string {
    const url = URL.parse(value)
    if (
        !url || !['http:', 'https:'].includes(url.protocol) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash
    ) {
        throw new Error('ADMIN_ORIGIN 必须是仅包含协议、主机和端口的 HTTP(S) 来源')
    }

    return url.origin
}
