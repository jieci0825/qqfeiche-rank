import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import { hashPassword } from '../auth/auth.crypto.ts'
import { requireAdmin } from '../auth/auth.routes.ts'
import { isValidPassword, parseCredentials } from '../auth/auth.service.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { PermissionCode } from './rbac.catalog.ts'
import { permissionActor } from './rbac.guard.ts'
import type { AuthorizedActor, MenuInput, RbacStore } from './rbac.store.ts'

interface Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    permission: PermissionCode
    handle: (ctx: Koa.Context, actor: AuthorizedActor, match: RegExpExecArray) => void | Promise<void>
}

interface Route {
    pattern: RegExp
    endpoints: readonly Endpoint[]
}

export function createRbacRoutes(rbac: RbacStore, auth: AuthService): Koa.Middleware {
    const routes: Route[] = [
        {
            pattern: /^\/api\/admin\/users$/,
            endpoints: [
                {
                    method: 'GET', permission: 'users:read',
                    handle(ctx) { ctx.body = { users: rbac.listUsers() } },
                },
                {
                    method: 'POST', permission: 'users:create',
                    async handle(ctx, actor) {
                        const body = await readJsonObject(ctx)
                        const credentials = parseCredentials(body.username, body.password)
                        if (!credentials) invalidInput('请输入有效的用户名和密码')
                        const displayName = requireText(body.displayName, 64, '显示名称')
                        const passwordHash = await hashPassword(credentials.password)
                        const user = rbac.createUser({ username: credentials.username, displayName, passwordHash }, actor)
                        ctx.body = { user }
                        ctx.status = 201
                    },
                },
            ],
        },
        {
            pattern: /^\/api\/admin\/users\/assignable-roles$/,
            endpoints: [{
                method: 'GET', permission: 'users:assign-roles',
                handle(ctx, actor) { ctx.body = { roles: rbac.listAssignableRoles(actor.authorize()) } },
            }],
        },
        {
            pattern: /^\/api\/admin\/users\/([1-9]\d*)$/,
            endpoints: [{
                method: 'PUT', permission: 'users:update',
                async handle(ctx, actor, match) {
                    const id = readId(match)
                    const body = await readJsonObject(ctx)
                    const displayName = requireText(body.displayName, 64, '显示名称')
                    ctx.body = { user: rbac.updateUser(id, displayName, actor) }
                },
            }],
        },
        userStatusRoute(true, rbac),
        userStatusRoute(false, rbac),
        {
            pattern: /^\/api\/admin\/users\/([1-9]\d*)\/reset-password$/,
            endpoints: [{
                method: 'POST', permission: 'users:reset-password',
                async handle(ctx, actor, match) {
                    const id = readId(match)
                    const { password } = await readJsonObject(ctx)
                    if (!isValidPassword(password)) invalidInput('请输入有效的密码')
                    rbac.resetPassword(id, await hashPassword(password), actor)
                    ctx.status = 204
                },
            }],
        },
        {
            pattern: /^\/api\/admin\/users\/([1-9]\d*)\/roles$/,
            endpoints: [{
                method: 'PUT', permission: 'users:assign-roles',
                async handle(ctx, actor, match) {
                    const id = readId(match)
                    const { roleIds } = await readJsonObject(ctx)
                    ctx.body = { user: rbac.assignUserRoles(id, parseRoleIds(roleIds), actor) }
                },
            }],
        },
        {
            pattern: /^\/api\/admin\/roles$/,
            endpoints: [
                {
                    method: 'GET', permission: 'roles:read',
                    handle(ctx) { ctx.body = { roles: rbac.listRoles() } },
                },
                {
                    method: 'POST', permission: 'roles:create',
                    async handle(ctx, actor) {
                        const body = await readJsonObject(ctx)
                        const code = requireText(body.code, 64, '角色编码')
                        if (!/^[a-z][a-z0-9_-]*$/.test(code)) {
                            invalidInput('角色编码须以小写字母开头，只能包含小写字母、数字、下划线和连字符')
                        }
                        ctx.body = { role: rbac.createRole({ code, ...parseRoleDetails(body) }, actor) }
                        ctx.status = 201
                    },
                },
            ],
        },
        {
            pattern: /^\/api\/admin\/roles\/([1-9]\d*)$/,
            endpoints: [
                {
                    method: 'PUT', permission: 'roles:update',
                    async handle(ctx, actor, match) {
                        const id = readId(match)
                        ctx.body = { role: rbac.updateRole(id, parseRoleDetails(await readJsonObject(ctx)), actor) }
                    },
                },
                {
                    method: 'DELETE', permission: 'roles:delete',
                    handle(ctx, actor, match) {
                        rbac.deleteRole(readId(match), actor)
                        ctx.status = 204
                    },
                },
            ],
        },
        {
            pattern: /^\/api\/admin\/roles\/([1-9]\d*)\/permissions$/,
            endpoints: [{
                method: 'PUT', permission: 'roles:assign-permissions',
                async handle(ctx, actor, match) {
                    const id = readId(match)
                    const { permissions } = await readJsonObject(ctx)
                    ctx.body = { role: rbac.assignRolePermissions(id, parsePermissions(permissions), actor) }
                },
            }],
        },
        {
            pattern: /^\/api\/admin\/permissions$/,
            endpoints: [{
                method: 'GET', permission: 'roles:read',
                handle(ctx) { ctx.body = { permissions: rbac.listPermissions() } },
            }],
        },
        {
            pattern: /^\/api\/admin\/menus$/,
            endpoints: [{
                method: 'GET', permission: 'menus:read',
                handle(ctx) { ctx.body = { menus: rbac.listMenus() } },
            }],
        },
        {
            pattern: /^\/api\/admin\/menus\/([1-9]\d*)$/,
            endpoints: [{
                method: 'PUT', permission: 'menus:update',
                async handle(ctx, actor, match) {
                    const id = readId(match)
                    ctx.body = { menu: rbac.updateMenu(id, parseMenu(await readJsonObject(ctx)), actor) }
                },
            }],
        },
    ]

    return async (ctx, next) => {
        for (const route of routes) {
            const match = route.pattern.exec(ctx.path)
            if (!match) continue

            ctx.set('Cache-Control', 'no-store')
            const endpoint = route.endpoints.find(endpoint => endpoint.method === ctx.method)
            if (!endpoint) {
                requireAdmin(ctx, auth)
                ctx.set('Allow', route.endpoints.map(endpoint => endpoint.method).join(', '))
                throw new HttpError(405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
            }

            const actor = permissionActor(ctx, auth, rbac, endpoint.permission)
            actor.authorize()
            await endpoint.handle(ctx, actor, match)
            return
        }

        return next()
    }
}

function userStatusRoute(isActive: boolean, rbac: RbacStore): Route {
    return {
        pattern: isActive ? /^\/api\/admin\/users\/([1-9]\d*)\/enable$/ : /^\/api\/admin\/users\/([1-9]\d*)\/disable$/,
        endpoints: [{
            method: 'POST', permission: isActive ? 'users:enable' : 'users:disable',
            handle(ctx, actor, match) {
                ctx.body = { user: rbac.setUserStatus(readId(match), isActive, actor) }
            },
        }],
    }
}

function readId(match: RegExpExecArray): number {
    const id = Number(match[1])
    if (!Number.isSafeInteger(id)) throw new HttpError(404, 'NOT_FOUND', '请求的资源不存在')
    return id
}

function parseRoleIds(value: unknown): number[] {
    if (!Array.isArray(value) || !value.every(id => Number.isSafeInteger(id) && id > 0)) {
        invalidInput('roleIds 必须是正整数数组')
    }
    return [...new Set<number>(value)].sort((a, b) => a - b)
}

function parsePermissions(value: unknown): string[] {
    if (!Array.isArray(value) || !value.every(code => typeof code === 'string' && code.length > 0)) {
        invalidInput('permissions 必须是权限码数组')
    }
    return [...new Set<string>(value)].sort()
}

function parseRoleDetails(body: Record<string, unknown>) {
    return { name: requireText(body.name, 64, '角色名称'), description: optionalText(body.description, 500, '角色描述') }
}

function parseMenu({ title, icon, sortOrder, isVisible }: Record<string, unknown>): MenuInput {
    if (typeof sortOrder !== 'number' || !Number.isSafeInteger(sortOrder)) invalidInput('排序值必须是有效整数')
    if (typeof isVisible !== 'boolean') invalidInput('isVisible 必须是布尔值')
    return { title: requireText(title, 64, '菜单名称'), icon: optionalText(icon, 128, '菜单图标'), sortOrder, isVisible }
}

function requireText(value: unknown, maxLength: number, label: string): string {
    const text = optionalText(value, maxLength, label)
    if (!text) invalidInput(`请输入${label}`)
    return text
}

function optionalText(value: unknown, maxLength: number, label: string): string | null {
    if (value == null) return null
    if (typeof value !== 'string' || value.trim().length > maxLength) {
        invalidInput(`${label}必须是文本且不能超过 ${maxLength} 字`)
    }
    return value.trim() || null
}

function invalidInput(message: string): never {
    throw new HttpError(400, 'INVALID_RBAC_INPUT', message)
}
