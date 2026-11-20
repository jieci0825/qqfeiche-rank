import { once } from 'node:events'
import { loadEnvFile } from 'node:process'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/database.ts'
import { AuthService } from './modules/auth/auth.service.ts'
import { createSqliteAuthStore } from './modules/auth/sqlite-auth.store.ts'
import { createDataStore } from './modules/data/data.store.ts'
import { createRbacStore } from './modules/rbac/rbac.store.ts'
import { createTrackStore } from './modules/tracks/tracks.store.ts'
import { createCosUploads } from './modules/uploads/cos-uploads.ts'

async function main(): Promise<void> {
    try {
        loadEnvFile(new URL('../.env', import.meta.url))
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }

    const { host, port, databasePath, adminUsername, adminPassword, adminOrigins, trustProxy, cos } = loadConfig(process.env)
    const db = openDatabase(databasePath)
    try {
        const auth = new AuthService(createSqliteAuthStore(db))
        await auth.initializeAdmin(adminUsername, adminPassword)
        const app = createApp({
            auth,
            rbac: createRbacStore(db),
            tracks: createTrackStore(db),
            data: createDataStore(db),
            cosUploads: cos && createCosUploads(cos),
            adminOrigins,
            trustProxy,
        })
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
