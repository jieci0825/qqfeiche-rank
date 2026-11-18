import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultDatabasePath = fileURLToPath(new URL('../data/qqfeiche.sqlite', import.meta.url))
const developmentOrigins = ['http://localhost:9432', 'http://127.0.0.1:9432']

export function loadConfig(env: NodeJS.ProcessEnv) {
    const port = Number(env.PORT ?? '9433')
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT 必须是 1 到 65535 之间的整数')
    }

    const production = env.NODE_ENV === 'production'
    const adminOrigin = env.ADMIN_ORIGIN ? parseAdminOrigin(env.ADMIN_ORIGIN) : undefined
    if (production && !adminOrigin?.startsWith('https://')) {
        throw new Error('生产环境必须配置 HTTPS 的 ADMIN_ORIGIN')
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
    }
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
