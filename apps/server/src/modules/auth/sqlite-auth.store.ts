import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { superAdminRoleCode } from '../rbac/rbac.catalog.ts'
import type {
    AdminAccount, AdminProfile, AdminSession, AuthAudit, AuthStore, IpLimit, LoginFailures,
} from './auth.store.ts'

type SessionRow = AdminProfile & { sessionId: number; refreshExpiresAt: string }

export function createSqliteAuthStore(db: DatabaseSync): AuthStore {
    return {
        transaction: operation => writeTransaction(db, operation),

        hasAdmin() {
            return Boolean(db.prepare('SELECT 1 FROM admins LIMIT 1').get())
        },

        createInitialAdmin(username, passwordHash, now) {
            const { lastInsertRowid } = db.prepare(`
                INSERT INTO admins (username, password_hash, display_name, created_at)
                VALUES (?, ?, ?, ?)
            `).run(username, passwordHash, username, now)
            db.prepare(`
                INSERT INTO admin_roles (admin_id, role_id)
                VALUES (?, (SELECT id FROM roles WHERE code = ?))
            `).run(lastInsertRowid, superAdminRoleCode)
        },

        findAdmin(username) {
            return db.prepare(`
                SELECT id, username, display_name AS displayName,
                       password_hash AS passwordHash, is_active AS isActive
                FROM admins WHERE username = ?
            `).get(username) as AdminAccount | undefined
        },

        updateLastLogin(adminId, now) {
            db.prepare('UPDATE admins SET last_login_at = ? WHERE id = ?').run(now, adminId)
        },

        getLoginFailures(adminId) {
            return db.prepare(`
                SELECT attempts, locked_until AS lockedUntil
                FROM admin_login_failures WHERE admin_id = ?
            `).get(adminId) as LoginFailures | undefined
        },

        saveLoginFailures(adminId, { attempts, lockedUntil }) {
            db.prepare(`
                INSERT INTO admin_login_failures (admin_id, attempts, locked_until) VALUES (?, ?, ?)
                ON CONFLICT (admin_id) DO UPDATE
                SET attempts = excluded.attempts, locked_until = excluded.locked_until
            `).run(adminId, attempts, lockedUntil)
        },

        clearLoginFailures(adminId) {
            db.prepare('DELETE FROM admin_login_failures WHERE admin_id = ?').run(adminId)
        },

        findIpLimit(ip) {
            return db.prepare(`
                SELECT attempts, expires_at AS expiresAt FROM admin_login_ip_limits WHERE ip = ?
            `).get(ip) as IpLimit | undefined
        },

        saveIpLimit(ip, { attempts, expiresAt }) {
            db.prepare(`
                INSERT INTO admin_login_ip_limits (ip, attempts, expires_at) VALUES (?, ?, ?)
                ON CONFLICT (ip) DO UPDATE
                SET attempts = excluded.attempts, expires_at = excluded.expires_at
            `).run(ip, attempts, expiresAt)
        },

        deleteExpiredIpLimits(now) {
            db.prepare('DELETE FROM admin_login_ip_limits WHERE expires_at <= ?').run(now)
        },

        createSession(adminId, tokens) {
            db.prepare(`
                INSERT INTO admin_sessions (
                    admin_id, access_hash, access_expires_at, refresh_hash, refresh_expires_at
                ) VALUES (?, ?, ?, ?, ?)
            `).run(adminId, tokens.accessHash, tokens.accessExpiresAt, tokens.refreshHash, tokens.refreshExpiresAt)
        },

        findSession(kind, hash, now): AdminSession | undefined {
            const row = db.prepare(`
                SELECT s.id AS sessionId, s.refresh_expires_at AS refreshExpiresAt,
                       a.id, a.username, a.display_name AS displayName
                FROM admin_sessions s
                JOIN admins a ON a.id = s.admin_id
                WHERE s.${kind}_hash = ? AND s.${kind}_expires_at > ? AND a.is_active = 1
            `).get(hash, now) as SessionRow | undefined

            if (!row) return undefined
            const { sessionId, refreshExpiresAt, ...admin } = row
            return { id: sessionId, admin, refreshExpiresAt }
        },

        rotateSession(id, { accessHash, accessExpiresAt, refreshHash }) {
            db.prepare(`
                UPDATE admin_sessions SET access_hash = ?, access_expires_at = ?, refresh_hash = ?
                WHERE id = ?
            `).run(accessHash, accessExpiresAt, refreshHash, id)
        },

        deleteSession(id) {
            db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(id)
        },

        deleteExpiredSessions(now) {
            db.prepare('DELETE FROM admin_sessions WHERE refresh_expires_at <= ?').run(now)
        },

        writeAudit({ adminId, action, ip, at, detail }: AuthAudit) {
            db.prepare(`
                INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, ip, created_at)
                VALUES (?, ?, 'admin', ?, ?, ?, ?)
            `).run(adminId, action, adminId, detail ? JSON.stringify(detail) : null, ip, at)
        },
    }
}
