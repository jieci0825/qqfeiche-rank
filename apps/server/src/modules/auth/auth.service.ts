import { hashPassword, hashToken, issueToken, isToken, verifyPassword } from './auth.crypto.ts'
import type { AdminProfile, AuthStore, SessionTokens } from './auth.store.ts'

const minute = 60_000
const accessLifetime = 15 * minute
const sessionLifetime = 7 * 24 * 60 * minute
const accountLockDuration = 15 * minute
const ipWindow = 15 * minute
const maxAccountFailures = 5
const maxIpAttempts = 20

interface Credentials {
    username: string
    password: string
}

export interface SessionGrant {
    admin: AdminProfile
    accessToken: string
    accessExpiresAt: string
    refreshToken: string
    refreshExpiresAt: string
}

type LoginFailure =
    | { code: 'INVALID_CREDENTIALS' }
    | { code: 'ACCOUNT_LOCKED' | 'LOGIN_RATE_LIMITED'; retryAfter: number }

export function parseCredentials(username: unknown, password: unknown): Credentials | undefined {
    if (typeof username !== 'string' || !isValidPassword(password)) return undefined

    const name = username.trim()
    if (!name || name.length > 64) return undefined

    return { username: name, password }
}

export function isValidPassword(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 256
}

export class AuthService {
    private readonly store: AuthStore

    constructor(store: AuthStore) {
        this.store = store
    }

    async initializeAdmin(username?: string, password?: string): Promise<void> {
        if (this.store.hasAdmin()) return

        const credentials = parseCredentials(username, password)
        if (!credentials) {
            throw new Error('首次启动请设置 ADMIN_USERNAME 和 ADMIN_PASSWORD')
        }

        const passwordHash = await hashPassword(credentials.password)
        this.store.transaction(() => {
            if (!this.store.hasAdmin()) {
                this.store.createInitialAdmin(credentials.username, passwordHash, new Date().toISOString())
            }
        })
    }

    async login({ username, password }: Credentials, ip: string): Promise<SessionGrant | LoginFailure> {
        const limited = this.reserveLoginAttempt(ip)
        if (limited) return limited

        const snapshot = this.store.findAdmin(username)
        if (snapshot?.isActive === 1) {
            const locked = this.store.getLoginFailures(snapshot.id)?.lockedUntil
            const now = Date.now()
            if (locked && locked > iso(now)) {
                return { code: 'ACCOUNT_LOCKED', retryAfter: retryAfter(locked, now) }
            }
        }

        const verified = await verifyPassword(password, snapshot?.passwordHash)

        // scrypt runs outside the write transaction. Recheck the account and lock before committing.
        return this.store.transaction(() => {
            const now = Date.now()
            const at = iso(now)
            const account = this.store.findAdmin(username)
            if (
                !snapshot || account?.isActive !== 1 ||
                account.id !== snapshot.id || account.passwordHash !== snapshot.passwordHash
            ) {
                this.store.writeAudit({
                    adminId: account?.id ?? null, action: 'auth.login_failed', ip, at,
                    detail: { username, attempts: null },
                })
                return { code: 'INVALID_CREDENTIALS' }
            }

            const failures = this.store.getLoginFailures(account.id)
            if (failures?.lockedUntil && failures.lockedUntil > at) {
                return { code: 'ACCOUNT_LOCKED', retryAfter: retryAfter(failures.lockedUntil, now) }
            }

            if (!verified) {
                const attempts = (failures?.lockedUntil ? 0 : failures?.attempts ?? 0) + 1
                const lockedUntil = attempts >= maxAccountFailures ? iso(now + accountLockDuration) : null
                this.store.saveLoginFailures(account.id, { attempts, lockedUntil })
                this.store.writeAudit({
                    adminId: account.id, action: 'auth.login_failed', ip, at,
                    detail: { username, attempts },
                })
                if (lockedUntil) return { code: 'ACCOUNT_LOCKED', retryAfter: retryAfter(lockedUntil, now) }
                return { code: 'INVALID_CREDENTIALS' }
            }

            const admin = { id: account.id, username: account.username, displayName: account.displayName }
            const grant = issueSession(admin, now, iso(now + sessionLifetime))
            this.store.deleteExpiredSessions(at)
            this.store.createSession(account.id, tokenRecord(grant))
            this.store.clearLoginFailures(account.id)
            this.store.updateLastLogin(account.id, at)
            this.store.writeAudit({ adminId: account.id, action: 'auth.login', ip, at })
            return grant
        })
    }

    refresh(refreshToken?: string): SessionGrant | undefined {
        if (!isToken(refreshToken)) return undefined

        return this.store.transaction(() => {
            const now = Date.now()
            const session = this.store.findSession('refresh', hashToken(refreshToken), iso(now))
            if (!session) return undefined

            const grant = issueSession(session.admin, now, session.refreshExpiresAt)
            this.store.rotateSession(session.id, tokenRecord(grant))
            return grant
        })
    }

    getAdmin(accessToken?: string): AdminProfile | undefined {
        return this.findSession('access', accessToken, new Date().toISOString())?.admin
    }

    logout(refreshToken: string | undefined, accessToken: string | undefined, ip: string): void {
        if (!isToken(refreshToken) && !isToken(accessToken)) return

        this.store.transaction(() => {
            const at = new Date().toISOString()
            const session = this.findSession('refresh', refreshToken, at) ??
                this.findSession('access', accessToken, at)
            if (!session) return

            this.store.deleteSession(session.id)
            this.store.writeAudit({ adminId: session.admin.id, action: 'auth.logout', ip, at })
        })
    }

    private findSession(kind: 'access' | 'refresh', token: string | undefined, at: string) {
        if (isToken(token)) return this.store.findSession(kind, hashToken(token), at)
    }

    private reserveLoginAttempt(ip: string): LoginFailure | undefined {
        return this.store.transaction(() => {
            const now = Date.now()
            this.store.deleteExpiredIpLimits(iso(now))
            const limit = this.store.findIpLimit(ip)
            if (limit && limit.attempts >= maxIpAttempts) {
                return { code: 'LOGIN_RATE_LIMITED', retryAfter: retryAfter(limit.expiresAt, now) }
            }

            this.store.saveIpLimit(ip, {
                attempts: (limit?.attempts ?? 0) + 1,
                expiresAt: limit?.expiresAt ?? iso(now + ipWindow),
            })
        })
    }
}

function issueSession(admin: AdminProfile, now: number, refreshExpiresAt: string): SessionGrant {
    return {
        admin,
        accessToken: issueToken(),
        accessExpiresAt: iso(Math.min(now + accessLifetime, Date.parse(refreshExpiresAt))),
        refreshToken: issueToken(),
        refreshExpiresAt,
    }
}

function tokenRecord(grant: SessionGrant): SessionTokens {
    return {
        accessHash: hashToken(grant.accessToken),
        accessExpiresAt: grant.accessExpiresAt,
        refreshHash: hashToken(grant.refreshToken),
        refreshExpiresAt: grant.refreshExpiresAt,
    }
}

function iso(milliseconds: number): string {
    return new Date(milliseconds).toISOString()
}

function retryAfter(deadline: string, now: number): number {
    return Math.max(1, Math.ceil((Date.parse(deadline) - now) / 1000))
}
