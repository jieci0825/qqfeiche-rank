export const superAdminRoleCode = 'super-admin'

type MenuDefinition = {
    key: string
    parentKey: string | null
    title: string
    path: string | null
    icon: string
    sortOrder: number
    permissions: readonly { code: string; label: string; kind: 'page' | 'action' }[]
}

// Migration 003 uses this snapshot. Add later catalog entries in a new migration.
export const initialRbacMenus = [
    {
        key: 'data', parentKey: null, title: '数据管理', path: null, icon: 'ep:files', sortOrder: 10,
        permissions: [],
    },
    {
        key: 'tracks', parentKey: 'data', title: '赛道管理', path: '/tracks', icon: 'ep:map-location', sortOrder: 10,
        permissions: [
            { code: 'tracks:read', label: '查看赛道', kind: 'page' },
            { code: 'tracks:create', label: '新增赛道', kind: 'action' },
            { code: 'tracks:update', label: '编辑赛道', kind: 'action' },
            { code: 'tracks:archive', label: '归档赛道', kind: 'action' },
        ],
    },
    {
        key: 'drivers', parentKey: 'data', title: '车手管理', path: '/people', icon: 'ep:user', sortOrder: 20,
        permissions: [{ code: 'drivers:read', label: '查看车手', kind: 'page' }],
    },
    {
        key: 'cars', parentKey: 'data', title: '赛车管理', path: '/cars', icon: 'ep:van', sortOrder: 30,
        permissions: [{ code: 'cars:read', label: '查看赛车', kind: 'page' }],
    },
    {
        key: 'pets', parentKey: 'data', title: '宠物管理', path: '/pets', icon: 'ep:star', sortOrder: 40,
        permissions: [{ code: 'pets:read', label: '查看宠物', kind: 'page' }],
    },
    {
        key: 'records', parentKey: null, title: '记录管理', path: '/records', icon: 'ep:trophy', sortOrder: 20,
        permissions: [{ code: 'records:read', label: '查看记录', kind: 'page' }],
    },
    {
        key: 'access', parentKey: null, title: '权限管理', path: null, icon: 'ep:lock', sortOrder: 30,
        permissions: [],
    },
    {
        key: 'users', parentKey: 'access', title: '用户管理', path: '/users', icon: 'ep:user', sortOrder: 10,
        permissions: [
            { code: 'users:read', label: '查看用户', kind: 'page' },
            { code: 'users:create', label: '新增用户', kind: 'action' },
            { code: 'users:update', label: '编辑用户', kind: 'action' },
            { code: 'users:enable', label: '启用用户', kind: 'action' },
            { code: 'users:disable', label: '停用用户', kind: 'action' },
            { code: 'users:reset-password', label: '重置密码', kind: 'action' },
            { code: 'users:assign-roles', label: '分配角色', kind: 'action' },
        ],
    },
    {
        key: 'roles', parentKey: 'access', title: '角色管理', path: '/roles', icon: 'ep:avatar', sortOrder: 20,
        permissions: [
            { code: 'roles:read', label: '查看角色', kind: 'page' },
            { code: 'roles:create', label: '新增角色', kind: 'action' },
            { code: 'roles:update', label: '编辑角色', kind: 'action' },
            { code: 'roles:delete', label: '删除角色', kind: 'action' },
            { code: 'roles:assign-permissions', label: '分配权限', kind: 'action' },
        ],
    },
    {
        key: 'menus', parentKey: 'access', title: '菜单管理', path: '/menus', icon: 'ep:menu', sortOrder: 30,
        permissions: [
            { code: 'menus:read', label: '查看菜单', kind: 'page' },
            { code: 'menus:update', label: '编辑菜单', kind: 'action' },
        ],
    },
] as const satisfies readonly MenuDefinition[]

export type PermissionCode = (typeof initialRbacMenus)[number]['permissions'][number]['code']
