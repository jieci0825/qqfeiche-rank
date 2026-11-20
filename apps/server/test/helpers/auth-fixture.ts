import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { TestContext } from 'node:test'
import { createApp } from '../../src/app.ts'
import { loadConfig } from '../../src/config.ts'
import { openDatabase } from '../../src/db/database.ts'
import { AuthService } from '../../src/modules/auth/auth.service.ts'
import { createSqliteAuthStore } from '../../src/modules/auth/sqlite-auth.store.ts'
import { createDataStore } from '../../src/modules/data/data.store.ts'
import { createRbacStore } from '../../src/modules/rbac/rbac.store.ts'
import { createRecordStore } from '../../src/modules/records/records.store.ts'
import { createTrackStore } from '../../src/modules/tracks/tracks.store.ts'

export const credentials = { username: 'integration-admin', password: 'integration-password' }
const authPath = '/api/admin/auth'
const localOrigin = 'http://localhost:9432'

export async function startAuthFixture(t: TestContext, env: NodeJS.ProcessEnv = {}) {
    const { adminOrigins, trustProxy } = loadConfig(env)
    const folder = await mkdtemp(join(tmpdir(), 'qqfeiche-auth-'))
    let database: DatabaseSync | undefined
    let server: Server | undefined

    t.after(async () => {
        try {
            if (server?.listening) {
                const closed = once(server, 'close')
                server.close()
                await closed
            }
        } finally {
            try {
                database?.close()
            } finally {
                await rm(folder, { recursive: true, force: true })
            }
        }
    })

    const db = openDatabase(join(folder, 'test.sqlite'))
    database = db
    const auth = new AuthService(createSqliteAuthStore(db))
    await auth.initializeAdmin(credentials.username, credentials.password)
    server = createApp({
        auth, rbac: createRbacStore(db), tracks: createTrackStore(db), data: createDataStore(db),
        records: createRecordStore(db), adminOrigins, trustProxy,
    }).listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const baseUrl = `http://127.0.0.1:${address.port}`

    function request(path: string, init?: RequestInit) {
        return fetch(baseUrl + path, { signal: AbortSignal.timeout(10_000), ...init })
    }

    function post(route: string, init?: RequestInit) {
        const headers = new Headers(init?.headers)
        if (!headers.has('origin')) headers.set('origin', env.ADMIN_ORIGIN ?? localOrigin)
        return request(authPath + route, { ...init, method: 'POST', headers })
    }

    return {
        db,
        request,
        post,
        login(input = credentials, headers?: RequestInit['headers']) {
            const jsonHeaders = new Headers(headers)
            jsonHeaders.set('content-type', 'application/json')
            return post('/login', { body: JSON.stringify(input), headers: jsonHeaders })
        },
        me(accessToken?: string) {
            return request(`${authPath}/me`, {
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
            })
        },
        refresh(cookie: string) {
            return post('/refresh', { headers: { cookie } })
        },
    }
}
