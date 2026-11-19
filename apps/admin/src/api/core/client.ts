import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { ApiError } from './errors'

export type AdminApiPath = `/api/admin/${string}`

export interface ApiOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: object
    signal?: AbortSignal
}

const adminApi = createAlova({
    requestAdapter: adapterFetch(),
    cacheFor: null,
    shareRequest: false,
    snapshots: 0,
    responded: readApiResponse,
})

export async function requestApi<T>(path: AdminApiPath, options: ApiOptions = {}, token?: string): Promise<T> {
    const { method = 'GET', body, signal } = options
    signal?.throwIfAborted()

    const request = adminApi.Request<T, T>({
        url: path,
        method,
        data: body,
        headers: {
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': body ? 'application/json' : '',
        },
        credentials: 'same-origin',
        redirect: 'error',
    })
    const abort = () => { void request.abort() }
    signal?.addEventListener('abort', abort, { once: true })
    try {
        return await request.send()
    } finally {
        signal?.removeEventListener('abort', abort)
    }
}

async function readApiResponse(response: Response): Promise<unknown> {
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

    if (response.status === 204) return undefined
    return response.json()
}
