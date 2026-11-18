import type Koa from 'koa'
import { requireAdmin } from '../auth/auth.routes.ts'
import type { AuthService } from '../auth/auth.service.ts'
import type { PermissionCode } from './rbac.catalog.ts'
import type { AuthorizedActor, RbacStore } from './rbac.store.ts'

export function permissionActor(
    ctx: Koa.Context,
    auth: AuthService,
    rbac: RbacStore,
    permission: PermissionCode,
): AuthorizedActor {
    return {
        ip: ctx.ip,
        authorize() {
            const { id } = requireAdmin(ctx, auth)
            return rbac.requirePermission(id, permission)
        },
    }
}
