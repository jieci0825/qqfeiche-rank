import { requestApi } from '../core/client'
import type { RoleSummary } from './roles'

export const authContextPath = '/api/admin/auth/me'

export interface AdminProfile {
    id: number
    username: string
    displayName: string
}

export interface AdminSession {
    admin: AdminProfile
    accessToken: string
}

export interface AdminMenu {
    id: number
    key: string
    parentId: number | null
    title: string
    path: string | null
    icon: string | null
    sortOrder: number
    isVisible: boolean
    permissionCode: string | null
    children: AdminMenu[]
}

export interface AdminContext {
    admin: AdminProfile
    roles: RoleSummary[]
    permissions: string[]
    menus: AdminMenu[]
}

export interface Credentials {
    username: string
    password: string
}

export function postAuth<T>(action: 'login' | 'refresh' | 'logout', body?: Credentials, token?: string) {
    function send() {
        return requestApi<T>(`/api/admin/auth/${action}`, {
            method: 'POST',
            body,
            signal: AbortSignal.timeout(15_000),
        }, token)
    }

    // 同源标签页共享 Refresh Cookie，等前一次请求应用完 Cookie 再发送下一次请求。
    return navigator.locks ? navigator.locks.request('qqfeiche-admin-auth', send) : send()
}
