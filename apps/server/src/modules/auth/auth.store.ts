export interface AdminProfile {
    id: number
    username: string
    displayName: string
}

export interface AdminAccount extends AdminProfile {
    passwordHash: string
    isActive: number
}

export interface SessionTokens {
    accessHash: string
    accessExpiresAt: string
    refreshHash: string
    refreshExpiresAt: string
}

export interface AdminSession {
    id: number
    admin: AdminProfile
    refreshExpiresAt: string
}

export interface LoginFailures {
    attempts: number
    lockedUntil: string | null
}

export interface IpLimit {
    attempts: number
    expiresAt: string
}

export interface AuthAudit {
    adminId: number | null
    action: 'auth.login' | 'auth.login_failed' | 'auth.logout'
    ip: string
    at: string
    detail?: { username: string; attempts: number | null }
}

export interface AuthStore {
    // Operations in a transaction run synchronously.
    transaction<T>(operation: () => T): T
    hasAdmin(): boolean
    createAdmin(username: string, passwordHash: string, now: string): void
    findAdmin(username: string): AdminAccount | undefined
    updateLastLogin(adminId: number, now: string): void
    getLoginFailures(adminId: number): LoginFailures | undefined
    saveLoginFailures(adminId: number, failures: LoginFailures): void
    clearLoginFailures(adminId: number): void
    findIpLimit(ip: string): IpLimit | undefined
    saveIpLimit(ip: string, limit: IpLimit): void
    deleteExpiredIpLimits(now: string): void
    createSession(adminId: number, tokens: SessionTokens): void
    findSession(kind: 'access' | 'refresh', hash: string, now: string): AdminSession | undefined
    rotateSession(id: number, tokens: Omit<SessionTokens, 'refreshExpiresAt'>): void
    deleteSession(id: number): void
    deleteExpiredSessions(now: string): void
    writeAudit(entry: AuthAudit): void
}
