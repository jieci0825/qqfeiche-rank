import { useAuthStore } from '@/stores/auth'
import type { AdminProfile, Credentials } from './auth'
import type { RoleSummary } from './roles'

export interface User extends AdminProfile {
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
    roleIds: number[]
}

export interface CreateUserInput extends Credentials {
    displayName: string
}

const usersPath = '/api/admin/users'

export function listUsers(signal?: AbortSignal) {
    return useAuthStore().request<{ users: User[] }>(usersPath, { signal })
}

export function createUser(input: CreateUserInput) {
    return useAuthStore().request<{ user: User }>(usersPath, { method: 'POST', body: input })
}

export function updateUser(id: number, displayName: string) {
    return useAuthStore().request<{ user: User }>(`${usersPath}/${id}`, { method: 'PUT', body: { displayName } })
}

export function setUserStatus(id: number, isActive: boolean) {
    const action = isActive ? 'enable' : 'disable'
    return useAuthStore().request<{ user: User }>(`${usersPath}/${id}/${action}`, { method: 'POST' })
}

export function resetUserPassword(id: number, password: string) {
    return useAuthStore().request<void>(`${usersPath}/${id}/reset-password`, { method: 'POST', body: { password } })
}

export function listAssignableRoles(signal?: AbortSignal) {
    return useAuthStore().request<{ roles: RoleSummary[] }>(`${usersPath}/assignable-roles`, { signal })
}

export function assignUserRoles(id: number, roleIds: number[]) {
    return useAuthStore().request<{ user: User }>(`${usersPath}/${id}/roles`, { method: 'PUT', body: { roleIds } })
}
