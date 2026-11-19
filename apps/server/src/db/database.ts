import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { authSchema } from './migrations/001-auth.ts'
import { trackSchema } from './migrations/002-tracks.ts'
import { rbacSchema, seedRbac } from './migrations/003-rbac.ts'
import { superAdminRoleProtection } from './migrations/004-protect-super-admin-role.ts'
import { trackCoverKeysSchema } from './migrations/005-track-cover-keys.ts'
import { filesSchema } from './migrations/006-files.ts'

const migrations: { version: number; sql: string; seed?: (db: DatabaseSync) => void }[] = [
    { version: 1, sql: authSchema },
    { version: 2, sql: trackSchema },
    { version: 3, sql: rbacSchema, seed: seedRbac },
    { version: 4, sql: superAdminRoleProtection },
    { version: 5, sql: trackCoverKeysSchema },
    { version: 6, sql: filesSchema },
]

export function openDatabase(path: string): DatabaseSync {
    if (path !== ':memory:') {
        mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    }

    const db = new DatabaseSync(path, { enableForeignKeyConstraints: true, timeout: 5000 })
    try {
        db.exec('PRAGMA journal_mode = WAL')
        writeTransaction(db, () => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TEXT NOT NULL
                )
            `)
            const applied = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
            const record = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
            for (const migration of migrations) {
                if (applied.get(migration.version)) continue

                db.exec(migration.sql)
                migration.seed?.(db)
                record.run(migration.version, new Date().toISOString())
            }
        })
        return db
    } catch (error) {
        db.close()
        throw error
    }
}

export function writeTransaction<T>(db: DatabaseSync, operation: () => T): T {
    db.exec('BEGIN IMMEDIATE')
    try {
        const result = operation()
        db.exec('COMMIT')
        return result
    } catch (error) {
        if (db.isTransaction) db.exec('ROLLBACK')
        throw error
    }
}
