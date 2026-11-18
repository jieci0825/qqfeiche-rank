export type AdminApiPath = `/api/admin/${string}`

export interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT'
    body?: object
    signal?: AbortSignal
}

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly retryAfter: number,
    ) {
        super(message)
    }
}

export function requestApi(path: AdminApiPath, options: ApiOptions = {}, token?: string) {
    const { method = 'GET', body, signal } = options
    const headers = new Headers({ Accept: 'application/json' })
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (body) headers.set('Content-Type', 'application/json')

    return fetch(path, {
        method,
        headers,
        body: body && JSON.stringify(body),
        credentials: 'same-origin',
        redirect: 'error',
        signal,
    })
}

export async function readApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const body = await response.json().catch(() => null)
        const retryAfter = Number(response.headers.get('Retry-After'))
        throw new ApiError(
            response.status,
            typeof body?.code === 'string' ? body.code : 'REQUEST_FAILED',
            typeof body?.message === 'string' ? body.message : '请求失败，请稍后重试',
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0,
        )
    }

    if (response.status === 204) return undefined as T
    return response.json()
}

export function apiErrorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : '连接服务失败，请稍后重试'
}
