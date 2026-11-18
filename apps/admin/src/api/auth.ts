import { readApiResponse, requestApi } from './http'

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
    title: string
    path: string | null
    icon: string | null
    children: AdminMenu[]
}

export interface Credentials {
    username: string
    password: string
}

export function postAuth<T>(action: 'login' | 'refresh' | 'logout', body?: Credentials, token?: string) {
    async function send() {
        const response = await requestApi(`/api/admin/auth/${action}`, {
            method: 'POST',
            body,
            signal: AbortSignal.timeout(15_000),
        }, token)
        return readApiResponse<T>(response)
    }

    // 同源标签页共享 Refresh Cookie，等前一次请求应用完 Cookie 再发送下一次请求。
    return navigator.locks ? navigator.locks.request('qqfeiche-admin-auth', send) : send()
}
