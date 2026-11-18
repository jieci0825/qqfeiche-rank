export const authSchema = `
    CREATE TABLE admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        last_login_at TEXT
    );

    CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        detail TEXT,
        ip TEXT,
        created_at TEXT NOT NULL
    );
    CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
    CREATE INDEX idx_audit_admin ON audit_logs (admin_id, created_at DESC);

    CREATE TABLE admin_sessions (
        id INTEGER PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        access_hash TEXT NOT NULL UNIQUE,
        access_expires_at TEXT NOT NULL,
        refresh_hash TEXT NOT NULL UNIQUE,
        refresh_expires_at TEXT NOT NULL
    );
    CREATE INDEX idx_admin_sessions_expiry ON admin_sessions (refresh_expires_at);

    CREATE TABLE admin_login_failures (
        admin_id INTEGER PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
        attempts INTEGER NOT NULL,
        locked_until TEXT
    );

    CREATE TABLE admin_login_ip_limits (
        ip TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        expires_at TEXT NOT NULL
    );
    CREATE INDEX idx_admin_login_ip_limits_expiry ON admin_login_ip_limits (expires_at);
`
