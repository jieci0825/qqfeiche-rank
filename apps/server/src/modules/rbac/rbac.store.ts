import type { DatabaseSync } from 'node:sqlite'
import { writeTransaction } from '../../db/database.ts'
import { HttpError } from '../../http/errors.ts'
import type { AdminProfile } from '../auth/auth.store.ts'
import { superAdminRoleCode } from './rbac.catalog.ts'
import type { PermissionCode } from './rbac.catalog.ts'

interface RoleSummary {
    id: number
    code: string
    name: string
    description: string | null
}

interface Role extends RoleSummary {
    isSystem: boolean
    permissions: string[]
}

interface User extends AdminProfile {
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
    roleIds: number[]
}

interface Permission {
    code: string
    menuId: number
    label: string
    kind: 'page' | 'action'
}

export interface MenuInput {
    title: string
    icon: string | null
    sortOrder: number
    isVisible: boolean
}

interface Menu extends MenuInput {
    id: number
    key: string
    parentId: number | null
    path: string | null
    permissionCode: string | null
}

interface MenuNode extends Menu {
    children: MenuNode[]
}

interface AdminAccess {
    adminId: number
    roles: RoleSummary[]
    isSuperAdmin: boolean
    permissions: ReadonlySet<string>
}

export interface AuthorizedActor {
    ip: string
    authorize: () => AdminAccess
}

type UserRow = Omit<User, 'isActive' | 'roleIds'> & { isActive: number; roleIds: string }
type RoleRow = RoleSummary & { permissions: string }
type MenuRow = Omit<Menu, 'isVisible'> & { isVisible: number }
type RecordChange = (action: string, entity: 'admin' | 'role' | 'menu', entityId: number, detail?: object) => void

const userColumns = `id, username, display_name AS displayName, is_active AS isActive,
    created_at AS createdAt, last_login_at AS lastLoginAt,
    (SELECT json_group_array(role_id ORDER BY role_id) FROM admin_roles WHERE admin_id = admins.id) AS roleIds`
const roleColumns = `id, code, name, description,
    (SELECT json_group_array(permission_code ORDER BY permission_code)
     FROM role_permissions WHERE role_id = roles.id) AS permissions`
const menuColumns = `m.id, m.key, m.parent_id AS parentId, m.title, m.path, m.icon,
    m.sort_order AS sortOrder, m.is_visible AS isVisible, p.code AS permissionCode`
const menuQuery = `SELECT ${menuColumns} FROM menus m
    LEFT JOIN permissions p ON p.menu_id = m.id AND p.kind = 'page'`

export type RbacStore = ReturnType<typeof createRbacStore>

export function createRbacStore(db: DatabaseSync) {
    const rolesForAdmin = db.prepare(`
        SELECT r.id, r.code, r.name, r.description
        FROM admin_roles ar JOIN roles r ON r.id = ar.role_id
        WHERE ar.admin_id = ? ORDER BY r.id
    `)
    const permissionsForAdmin = db.prepare(`
        SELECT DISTINCT rp.permission_code AS code FROM admin_roles ar
        JOIN role_permissions rp ON rp.role_id = ar.role_id
        WHERE ar.admin_id = ? ORDER BY rp.permission_code
    `)
    const allPermissionCodes = db.prepare('SELECT code FROM permissions ORDER BY code')
    const menuRows = db.prepare(`${menuQuery} ORDER BY m.sort_order, m.id`)
    const menuById = db.prepare(`${menuQuery} WHERE m.id = ?`)
    const userById = db.prepare(`SELECT ${userColumns} FROM admins WHERE id = ?`)
    const roleById = db.prepare(`SELECT ${roleColumns} FROM roles WHERE id = ?`)
    const roleRows = db.prepare(`SELECT ${roleColumns} FROM roles ORDER BY id`)
    const deleteUserSessions = db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?')
    const otherActiveSuperAdmin = db.prepare(`
        SELECT 1 FROM admin_roles ar JOIN admins a ON a.id = ar.admin_id
        JOIN roles r ON r.id = ar.role_id
        WHERE r.code = ? AND a.id <> ? AND a.is_active = 1 LIMIT 1
    `)
    const insertAudit = db.prepare(`
        INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, detail, ip, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    function getAccess(adminId: number): AdminAccess {
        const roles = rolesForAdmin.all(adminId) as unknown as RoleSummary[]
        const isSuperAdmin = roles.some(role => role.code === superAdminRoleCode)
        const rows = isSuperAdmin ? allPermissionCodes.all() : permissionsForAdmin.all(adminId)
        const permissions = new Set(rows.map(row => row.code as string))
        return { adminId, roles, isSuperAdmin, permissions }
    }

    function toRole(row: RoleRow): Role {
        const isSystem = row.code === superAdminRoleCode
        const permissions = isSystem
            ? allPermissionCodes.all().map(permission => permission.code as string)
            : JSON.parse(row.permissions) as string[]
        return { ...row, isSystem, permissions }
    }

    function listRoles(): Role[] {
        return (roleRows.all() as unknown as RoleRow[]).map(toRole)
    }

    function requireUser(id: number): User {
        const row = userById.get(id) as UserRow | undefined
        if (!row) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在')
        return toUser(row)
    }

    function requireRole(id: number): Role {
        const row = roleById.get(id) as RoleRow | undefined
        if (!row) throw new HttpError(404, 'ROLE_NOT_FOUND', '角色不存在')
        return toRole(row)
    }

    function requireMenu(id: number): Menu {
        const row = menuById.get(id) as MenuRow | undefined
        if (!row) throw new HttpError(404, 'MENU_NOT_FOUND', '菜单不存在')
        return toMenu(row)
    }

    function requireManageableUser(access: AdminAccess, id: number): User {
        const user = requireUser(id)
        if (!access.isSuperAdmin) {
            const target = getAccess(id)
            assertScope(access, target.isSuperAdmin, target.permissions)
        }
        return user
    }

    function requireEditableRole(access: AdminAccess, id: number): Role {
        const role = requireRole(id)
        assertScope(access, role.isSystem, role.permissions)
        if (role.isSystem) throw new HttpError(409, 'SYSTEM_ROLE_IMMUTABLE', '超级管理员角色为内置角色')
        return role
    }

    function requireOtherActiveSuperAdmin(id: number): void {
        if (!otherActiveSuperAdmin.get(superAdminRoleCode, id)) {
            throw new HttpError(409, 'LAST_ACTIVE_SUPER_ADMIN', '至少需要保留一个启用的超级管理员')
        }
    }

    function mutate<T>(actor: AuthorizedActor, operation: (access: AdminAccess, audit: RecordChange) => T): T {
        return writeTransaction(db, () => {
            const access = actor.authorize()
            return operation(access, (action, entity, entityId, detail) => {
                insertAudit.run(access.adminId, action, entity, entityId,
                    detail ? JSON.stringify(detail) : null, actor.ip, new Date().toISOString())
            })
        })
    }

    return {
        requirePermission(adminId: number, code: PermissionCode): AdminAccess {
            const access = getAccess(adminId)
            if (!access.permissions.has(code)) {
                throw new HttpError(403, 'PERMISSION_DENIED', '当前账号没有此操作的权限')
            }
            return access
        },

        getContext(adminId: number) {
            const { roles, permissions } = getAccess(adminId)
            return {
                roles,
                permissions: [...permissions],
                menus: buildMenuTree(menuRows.all() as unknown as MenuRow[], permissions),
            }
        },

        listMenus() {
            return buildMenuTree(menuRows.all() as unknown as MenuRow[])
        },

        listPermissions(): Permission[] {
            return db.prepare(`
                SELECT code, menu_id AS menuId, label, kind FROM permissions ORDER BY menu_id, code
            `).all() as unknown as Permission[]
        },

        listUsers(): User[] {
            return (db.prepare(`SELECT ${userColumns} FROM admins ORDER BY id`).all() as unknown as UserRow[]).map(toUser)
        },

        listRoles,

        listAssignableRoles(access: AdminAccess): RoleSummary[] {
            return listRoles()
                .filter(role => isWithinScope(access, role.isSystem, role.permissions))
                .map(({ id, code, name, description }) => ({ id, code, name, description }))
        },

        createUser(input: { username: string; displayName: string; passwordHash: string }, actor: AuthorizedActor) {
            return mutate(actor, (_, audit) => {
                if (db.prepare('SELECT 1 FROM admins WHERE username = ?').get(input.username)) {
                    throw new HttpError(409, 'USERNAME_EXISTS', '用户名已存在')
                }
                const { lastInsertRowid } = db.prepare(`
                    INSERT INTO admins (username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)
                `).run(input.username, input.displayName, input.passwordHash, new Date().toISOString())
                const user = requireUser(Number(lastInsertRowid))
                audit('user.create', 'admin', user.id, { after: user })
                return user
            })
        },

        updateUser(id: number, displayName: string, actor: AuthorizedActor) {
            return mutate(actor, (access, audit) => {
                const before = requireManageableUser(access, id)
                db.prepare('UPDATE admins SET display_name = ? WHERE id = ?').run(displayName, id)
                const after = { ...before, displayName }
                audit('user.update', 'admin', id, { before, after })
                return after
            })
        },

        setUserStatus(id: number, isActive: boolean, actor: AuthorizedActor) {
            return mutate(actor, (access, audit) => {
                const before = requireManageableUser(access, id)
                if (before.isActive === isActive) return before

                if (!isActive) {
                    if (getAccess(id).isSuperAdmin) requireOtherActiveSuperAdmin(id)
                    deleteUserSessions.run(id)
                }
                db.prepare('UPDATE admins SET is_active = ? WHERE id = ?').run(Number(isActive), id)
                audit(isActive ? 'user.enable' : 'user.disable', 'admin', id, { isActive })
                return { ...before, isActive }
            })
        },

        resetPassword(id: number, passwordHash: string, actor: AuthorizedActor) {
            mutate(actor, (access, audit) => {
                requireManageableUser(access, id)
                db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, id)
                db.prepare('DELETE FROM admin_login_failures WHERE admin_id = ?').run(id)
                deleteUserSessions.run(id)
                audit('user.reset_password', 'admin', id)
            })
        },

        assignUserRoles(id: number, roleIds: number[], actor: AuthorizedActor) {
            return mutate(actor, (access, audit) => {
                const user = requireManageableUser(access, id)
                const roles = roleIds.map(requireRole)
                for (const role of roles) assertScope(access, role.isSystem, role.permissions)
                if (user.isActive && !roles.some(role => role.isSystem) && getAccess(id).isSuperAdmin) {
                    requireOtherActiveSuperAdmin(id)
                }

                db.prepare('DELETE FROM admin_roles WHERE admin_id = ?').run(id)
                const bindRole = db.prepare('INSERT INTO admin_roles (admin_id, role_id) VALUES (?, ?)')
                for (const roleId of roleIds) bindRole.run(id, roleId)
                audit('user.assign_roles', 'admin', id, { before: user.roleIds, after: roleIds })
                return { ...user, roleIds }
            })
        },

        createRole(input: { code: string; name: string; description: string | null }, actor: AuthorizedActor) {
            return mutate(actor, (_, audit) => {
                if (db.prepare('SELECT 1 FROM roles WHERE code = ?').get(input.code)) {
                    throw new HttpError(409, 'ROLE_CODE_EXISTS', '角色编码已存在')
                }
                const { lastInsertRowid } = db.prepare('INSERT INTO roles (code, name, description) VALUES (?, ?, ?)')
                    .run(input.code, input.name, input.description)
                const role = requireRole(Number(lastInsertRowid))
                audit('role.create', 'role', role.id, { after: role })
                return role
            })
        },

        updateRole(id: number, input: { name: string; description: string | null }, actor: AuthorizedActor) {
            return mutate(actor, (access, audit) => {
                const before = requireEditableRole(access, id)
                db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?').run(input.name, input.description, id)
                const after = { ...before, ...input }
                audit('role.update', 'role', id, { before, after })
                return after
            })
        },

        deleteRole(id: number, actor: AuthorizedActor) {
            mutate(actor, (access, audit) => {
                const before = requireEditableRole(access, id)
                if (db.prepare('SELECT 1 FROM admin_roles WHERE role_id = ? LIMIT 1').get(id)) {
                    throw new HttpError(409, 'ROLE_IN_USE', '该角色仍被用户使用，请先解除绑定')
                }
                db.prepare('DELETE FROM roles WHERE id = ?').run(id)
                audit('role.delete', 'role', id, { before })
            })
        },

        assignRolePermissions(id: number, permissions: string[], actor: AuthorizedActor) {
            return mutate(actor, (access, audit) => {
                const role = requireEditableRole(access, id)
                const registered = new Set(allPermissionCodes.all().map(row => row.code))
                if (permissions.some(code => !registered.has(code))) {
                    throw new HttpError(400, 'UNKNOWN_PERMISSION', '存在未注册的权限码')
                }
                assertScope(access, false, permissions)

                db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
                const bindPermission = db.prepare('INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)')
                for (const code of permissions) bindPermission.run(id, code)
                audit('role.assign_permissions', 'role', id, { before: role.permissions, after: permissions })
                return { ...role, permissions }
            })
        },

        updateMenu(id: number, input: MenuInput, actor: AuthorizedActor) {
            return mutate(actor, (_, audit) => {
                const before = requireMenu(id)
                db.prepare('UPDATE menus SET title = ?, icon = ?, sort_order = ?, is_visible = ? WHERE id = ?')
                    .run(input.title, input.icon, input.sortOrder, Number(input.isVisible), id)
                const after = { ...before, ...input }
                audit('menu.update', 'menu', id, { before, after })
                return after
            })
        },
    }
}

function isWithinScope(access: AdminAccess, isSuperAdmin: boolean, codes: Iterable<string>): boolean {
    if (access.isSuperAdmin) return true
    if (isSuperAdmin) return false
    for (const code of codes) {
        if (!access.permissions.has(code)) return false
    }
    return true
}

function assertScope(access: AdminAccess, isSuperAdmin: boolean, codes: Iterable<string>): void {
    if (!isWithinScope(access, isSuperAdmin, codes)) {
        throw new HttpError(403, 'PERMISSION_SCOPE_EXCEEDED', '目标账号或角色的权限超出当前账号的管理范围')
    }
}

function toUser(row: UserRow): User {
    return { ...row, isActive: row.isActive === 1, roleIds: JSON.parse(row.roleIds) as number[] }
}

function toMenu(row: MenuRow): Menu {
    return { ...row, isVisible: row.isVisible === 1 }
}

function buildMenuTree(rows: MenuRow[], permissions?: ReadonlySet<string>): MenuNode[] {
    const byParent = new Map<number | null, MenuRow[]>()
    for (const row of rows) {
        const siblings = byParent.get(row.parentId)
        if (siblings) siblings.push(row)
        else byParent.set(row.parentId, [row])
    }

    function build(parentId: number | null): MenuNode[] {
        const nodes: MenuNode[] = []
        for (const row of byParent.get(parentId) ?? []) {
            if (permissions && (!row.isVisible || (row.path !== null && !permissions.has(row.permissionCode ?? '')))) continue

            const children = build(row.id)
            if (permissions && row.path === null && children.length === 0) continue
            nodes.push({ ...toMenu(row), children })
        }
        return nodes
    }

    return build(null)
}
