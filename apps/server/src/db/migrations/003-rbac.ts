import type { DatabaseSync } from 'node:sqlite'
import { initialRbacMenus, superAdminRoleCode } from '../../modules/rbac/rbac.catalog.ts'

export const rbacSchema = `
    CREATE TABLE roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT
    );

    CREATE TABLE menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        parent_id INTEGER REFERENCES menus(id) ON DELETE RESTRICT,
        title TEXT NOT NULL,
        path TEXT UNIQUE,
        icon TEXT,
        sort_order INTEGER NOT NULL,
        is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1))
    );
    CREATE INDEX idx_menus_parent_sort ON menus (parent_id, sort_order, id);

    CREATE TABLE permissions (
        code TEXT PRIMARY KEY NOT NULL,
        menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
        label TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('page', 'action'))
    );
    CREATE INDEX idx_permissions_menu ON permissions (menu_id);
    CREATE UNIQUE INDEX idx_permissions_page ON permissions (menu_id) WHERE kind = 'page';

    CREATE TABLE admin_roles (
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        PRIMARY KEY (admin_id, role_id)
    );
    CREATE INDEX idx_admin_roles_role ON admin_roles (role_id, admin_id);

    CREATE TABLE role_permissions (
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE RESTRICT,
        PRIMARY KEY (role_id, permission_code)
    );
    CREATE INDEX idx_role_permissions_code ON role_permissions (permission_code);
`

export function seedRbac(db: DatabaseSync): void {
    const role = db.prepare('INSERT INTO roles (code, name, description) VALUES (?, ?, ?)')
        .run(superAdminRoleCode, '超级管理员', '拥有全部已注册的后台权限')
    db.prepare(`
        INSERT INTO admin_roles (admin_id, role_id)
        SELECT id, ? FROM admins ORDER BY is_active DESC, id LIMIT 1
    `).run(role.lastInsertRowid)

    const insertMenu = db.prepare(`
        INSERT INTO menus (key, parent_id, title, path, icon, sort_order)
        VALUES (?, (SELECT id FROM menus WHERE key = ?), ?, ?, ?, ?)
    `)
    const insertPermission = db.prepare('INSERT INTO permissions (code, menu_id, label, kind) VALUES (?, ?, ?, ?)')

    for (const menu of initialRbacMenus) {
        const { lastInsertRowid } = insertMenu.run(menu.key, menu.parentKey, menu.title, menu.path, menu.icon, menu.sortOrder)
        for (const permission of menu.permissions) {
            insertPermission.run(permission.code, lastInsertRowid, permission.label, permission.kind)
        }
    }
}
