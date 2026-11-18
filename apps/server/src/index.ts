import { once } from 'node:events'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/database.ts'
import { AuthService } from './modules/auth/auth.service.ts'
import { createSqliteAuthStore } from './modules/auth/sqlite-auth.store.ts'

async function main(): Promise<void> {
    const { host, port, databasePath, adminUsername, adminPassword, adminOrigins, trustProxy } = loadConfig(process.env)
    const db = openDatabase(databasePath)
    try {
        const auth = new AuthService(createSqliteAuthStore(db))
        await auth.initializeAdmin(adminUsername, adminPassword)
        const app = createApp({ auth, adminOrigins, trustProxy })
        const server = app.listen(port, host)
        await once(server, 'listening')
        console.info(`API 服务已启动，监听 ${host}:${port}`)

        const shutdown = () => server.close()
        process.once('SIGINT', shutdown)
        process.once('SIGTERM', shutdown)
        server.once('close', () => db.close())
    } catch (error) {
        db.close()
        throw error
    }
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
