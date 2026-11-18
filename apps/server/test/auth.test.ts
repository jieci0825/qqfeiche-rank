import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { credentials, startAuthFixture } from './helpers/auth-fixture.ts'

const minute = 60_000
const week = 7 * 24 * 60 * minute
const admin = { id: 1, username: credentials.username, displayName: credentials.username }

interface TokenResponse {
    admin: typeof admin
    accessToken: string
    accessExpiresAt: string
    refreshExpiresAt: string
}

async function expectGrant(response: Response) {
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const body = await response.json() as TokenResponse
    assert.deepEqual(Object.keys(body).sort(), ['accessExpiresAt', 'accessToken', 'admin', 'refreshExpiresAt'])
    assert.deepEqual(body.admin, admin)
    assert.match(body.accessToken, /^[A-Za-z0-9_-]{43}$/)

    const setCookie = response.headers.get('set-cookie')
    assert.ok(setCookie)
    const cookieMatch = /^(admin_refresh=([A-Za-z0-9_-]{43}));/.exec(setCookie)
    assert.ok(cookieMatch, '响应必须通过 admin_refresh Cookie 签发 Refresh Token')
    assert.match(setCookie, /; path=\/api\/admin\/auth(?:;|$)/i)
    assert.match(setCookie, /; httponly(?:;|$)/i)
    assert.match(setCookie, /; samesite=lax(?:;|$)/i)
    assert.ok(setCookie.includes(`expires=${new Date(body.refreshExpiresAt).toUTCString()}`))
    assert.notEqual(body.accessToken, cookieMatch[2])
    return { ...body, cookie: cookieMatch[1], refreshToken: cookieMatch[2], setCookie }
}

async function expectFailure(response: Response, status: number, code: string) {
    assert.equal(response.status, status)
    assert.equal(response.headers.get('set-cookie'), null)
    const body = await response.json() as { code: unknown; message: unknown }
    assert.equal(body.code, code)
    assert.ok(typeof body.message === 'string' && body.message.length > 0)
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
}

test('登录签发双令牌，刷新轮换令牌，登出撤销会话', async t => {
    const now = Date.now()
    t.mock.timers.enable({ apis: ['Date'], now })
    const api = await startAuthFixture(t)

    const noToken = await api.me()
    assert.equal(noToken.headers.get('www-authenticate'), 'Bearer')
    await expectFailure(noToken, 401, 'INVALID_SESSION')

    const first = await expectGrant(await api.login())
    assert.equal(Date.parse(first.accessExpiresAt), now + 15 * minute)
    assert.equal(Date.parse(first.refreshExpiresAt), now + week)
    assert.doesNotMatch(first.setCookie, /; secure(?:;|$)/i)
    const hashes = api.db.prepare('SELECT access_hash, refresh_hash FROM admin_sessions').get()
    assert.deepEqual({ ...hashes }, {
        access_hash: sha256(first.accessToken),
        refresh_hash: sha256(first.refreshToken),
    })

    const profile = await api.me(first.accessToken)
    assert.equal(profile.status, 200)
    const context = await profile.json() as {
        admin: typeof admin
        roles: { code: string }[]
        permissions: string[]
        menus: { title: string }[]
    }
    assert.deepEqual(context.admin, admin)
    assert.deepEqual(context.roles.map(role => role.code), ['super-admin'])
    assert.ok(context.permissions.includes('tracks:archive'))
    assert.deepEqual(context.menus.map(menu => menu.title), ['数据管理', '记录管理', '权限管理'])
    await expectFailure(await api.me(first.refreshToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(`admin_refresh=${first.accessToken}`), 401, 'INVALID_SESSION')

    t.mock.timers.tick(minute)
    const next = await expectGrant(await api.refresh(first.cookie))
    assert.notEqual(next.accessToken, first.accessToken)
    assert.notEqual(next.refreshToken, first.refreshToken)
    assert.equal(Date.parse(next.accessExpiresAt), now + 16 * minute)
    assert.equal(next.refreshExpiresAt, first.refreshExpiresAt)
    await expectFailure(await api.me(first.accessToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(first.cookie), 401, 'INVALID_SESSION')
    const refreshedProfile = await api.me(next.accessToken)
    assert.equal(refreshedProfile.status, 200)
    assert.deepEqual(await refreshedProfile.json(), context)

    const logout = await api.post('/logout', { headers: { cookie: next.cookie } })
    assert.equal(logout.status, 204)
    const clearedCookie = logout.headers.get('set-cookie')
    assert.ok(clearedCookie)
    assert.match(clearedCookie, /^admin_refresh=;/)
    assert.match(clearedCookie, /; path=\/api\/admin\/auth(?:;|$)/i)
    assert.match(clearedCookie, /; expires=Thu, 01 Jan 1970 00:00:00 GMT(?:;|$)/i)
    await expectFailure(await api.me(next.accessToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(next.cookie), 401, 'INVALID_SESSION')
    assert.equal((await api.post('/logout', { headers: { cookie: next.cookie } })).status, 204)
    assert.equal(api.db.prepare('SELECT COUNT(*) AS count FROM admin_sessions').get()?.count, 0)
    assert.equal(api.db.prepare('SELECT last_login_at FROM admins').get()?.last_login_at, new Date(now).toISOString())
    assert.deepEqual(
        api.db.prepare('SELECT action FROM audit_logs ORDER BY id').all().map(row => row.action),
        ['auth.login', 'auth.logout'],
    )
})

test('同一个 Refresh Token 的并发请求只有一次能成功', async t => {
    const api = await startAuthFixture(t)
    const first = await expectGrant(await api.login())
    const responses = await Promise.all([api.refresh(first.cookie), api.refresh(first.cookie)])
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 401])
    const [success, failure] = responses.sort((a, b) => a.status - b.status)
    const next = await expectGrant(success)
    await expectFailure(failure, 401, 'INVALID_SESSION')
    const profile = await api.me(next.accessToken)
    assert.equal(profile.status, 200)
    await profile.json()
    assert.equal((await expectGrant(await api.refresh(next.cookie))).refreshExpiresAt, first.refreshExpiresAt)
})

test('两种令牌在各自的截止时间失效，刷新受会话绝对期限约束', async t => {
    const now = Date.now()
    t.mock.timers.enable({ apis: ['Date'], now })
    const api = await startAuthFixture(t)
    const first = await expectGrant(await api.login())

    t.mock.timers.setTime(now + 15 * minute)
    await expectFailure(await api.me(first.accessToken), 401, 'INVALID_SESSION')
    const next = await expectGrant(await api.refresh(first.cookie))
    assert.equal(Date.parse(next.accessExpiresAt), now + 30 * minute)

    t.mock.timers.setTime(now + week - minute)
    const last = await expectGrant(await api.refresh(next.cookie))
    assert.equal(last.accessExpiresAt, first.refreshExpiresAt)
    assert.equal(last.refreshExpiresAt, first.refreshExpiresAt)

    t.mock.timers.setTime(now + week)
    await expectFailure(await api.me(last.accessToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(last.cookie), 401, 'INVALID_SESSION')
})

test('Bearer 登出只撤销当前会话，停用管理员后拒绝认证', async t => {
    const api = await startAuthFixture(t)
    const first = await expectGrant(await api.login())
    const second = await expectGrant(await api.login())

    const logout = await api.post('/logout', { headers: { authorization: `Bearer ${first.accessToken}` } })
    assert.equal(logout.status, 204)
    await expectFailure(await api.me(first.accessToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(first.cookie), 401, 'INVALID_SESSION')
    const profile = await api.me(second.accessToken)
    assert.equal(profile.status, 200)
    await profile.json()

    api.db.exec('UPDATE admins SET is_active = 0')
    await expectFailure(await api.me(second.accessToken), 401, 'INVALID_SESSION')
    await expectFailure(await api.refresh(second.cookie), 401, 'INVALID_SESSION')
    await expectFailure(await api.login(), 401, 'INVALID_CREDENTIALS')
})

test('连续五次失败锁定账号，同一 IP 的第 21 次提交被限流', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() })
    const api = await startAuthFixture(t)
    const invalid = { ...credentials, password: 'wrong-password' }
    for (let attempt = 1; attempt <= 4; attempt++) {
        await expectFailure(await api.login(invalid), 401, 'INVALID_CREDENTIALS')
    }

    const locked = await api.login(invalid)
    assert.equal(locked.headers.get('retry-after'), '900')
    await expectFailure(locked, 429, 'ACCOUNT_LOCKED')
    for (let attempt = 6; attempt <= 20; attempt++) {
        await expectFailure(await api.login(), 429, 'ACCOUNT_LOCKED')
    }
    const limited = await api.login()
    assert.equal(limited.headers.get('retry-after'), '900')
    await expectFailure(limited, 429, 'LOGIN_RATE_LIMITED')

    t.mock.timers.tick(15 * minute)
    await expectGrant(await api.login())
    assert.equal(api.db.prepare('SELECT COUNT(*) AS count FROM admin_login_failures').get()?.count, 0)
    const audit = api.db.prepare("SELECT detail FROM audit_logs WHERE action = 'auth.login_failed' ORDER BY id").all()
    assert.deepEqual(audit.map(row => JSON.parse(String(row.detail))), [
        { username: credentials.username, attempts: 1 },
        { username: credentials.username, attempts: 2 },
        { username: credentials.username, attempts: 3 },
        { username: credentials.username, attempts: 4 },
        { username: credentials.username, attempts: 5 },
    ])
})

test('认证写接口校验来源，受信代理后的 HTTPS 使用 Secure Cookie', async t => {
    const api = await startAuthFixture(t, {
        ADMIN_ORIGIN: 'https://admin.example.test',
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
    })
    const proxyHeaders = { 'x-forwarded-proto': 'https', 'x-forwarded-for': '203.0.113.10' }
    const foreignHeaders = { ...proxyHeaders, origin: 'https://other.example.test' }
    await expectFailure(await api.login(credentials, foreignHeaders), 403, 'INVALID_ORIGIN')
    await expectFailure(await api.login(), 403, 'HTTPS_REQUIRED')
    const grant = await expectGrant(await api.login(credentials, proxyHeaders))
    assert.match(grant.setCookie, /; secure(?:;|$)/i)

    const foreignCookieHeaders = { ...foreignHeaders, cookie: grant.cookie }
    await expectFailure(await api.post('/refresh', { headers: foreignCookieHeaders }), 403, 'INVALID_ORIGIN')
    await expectFailure(await api.post('/logout', { headers: foreignCookieHeaders }), 403, 'INVALID_ORIGIN')
    const next = await expectGrant(await api.post('/refresh', { headers: { ...proxyHeaders, cookie: grant.cookie } }))
    assert.match(next.setCookie, /; secure(?:;|$)/i)
})

test('健康检查可用，登录拒绝缺少来源、无效 JSON 和超限请求体', async t => {
    const api = await startAuthFixture(t)
    const health = await api.request('/api/health')
    assert.equal(health.status, 200)
    const healthBody = await health.json() as { status: unknown }
    assert.equal(healthBody.status, 'ok')

    await expectFailure(
        await api.request('/api/admin/auth/login', { method: 'POST' }), 403, 'INVALID_ORIGIN',
    )
    const json = { 'content-type': 'application/json' }
    await expectFailure(await api.post('/login', { headers: json, body: '{' }), 400, 'INVALID_JSON')
    await expectFailure(await api.post('/login', { headers: json, body: '{}' }), 400, 'INVALID_CREDENTIALS_INPUT')
    await expectFailure(await api.post('/login', { headers: json, body: ' '.repeat(8193) }), 413, 'BODY_TOO_LARGE')
    await expectFailure(await api.post('/login', { body: 'plain text' }), 415, 'UNSUPPORTED_MEDIA_TYPE')
})
