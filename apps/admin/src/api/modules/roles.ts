import { useAuthStore } from '@/stores/auth'

export interface RoleSummary {
    id: number
    code: string
    name: string
    description: string | null
}

export interface Role extends RoleSummary {
    isSystem: boolean
    permissions: string[]
}

export interface RoleInput {
    name: string
    description?: string | null
}

export interface CreateRoleInput extends RoleInput {
    code: string
}

const rolesPath = '/api/admin/roles'

export function listRoles(signal?: AbortSignal) {
    return useAuthStore().request<{ roles: Role[] }>(rolesPath, { signal })
}

export function createRole(input: CreateRoleInput) {
    return useAuthStore().request<{ role: Role }>(rolesPath, { method: 'POST', body: input })
}

export function updateRole(id: number, input: RoleInput) {
    return useAuthStore().request<{ role: Role }>(`${rolesPath}/${id}`, { method: 'PUT', body: input })
}

export function deleteRole(id: number) {
    return useAuthStore().request<void>(`${rolesPath}/${id}`, { method: 'DELETE' })
}

export function assignRolePermissions(id: number, permissions: string[]) {
    return useAuthStore().request<{ role: Role }>(`${rolesPath}/${id}/permissions`, { method: 'PUT', body: { permissions } })
}
