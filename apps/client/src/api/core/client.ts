import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import { ApiError } from './errors'

export type PublicApiPath = `/api/public/${string}`

export interface ApiOptions {
    signal?: AbortSignal
}

const publicApi = createAlova({
    requestAdapter: adapterFetch(),
    cacheFor: null,
    shareRequest: false,
    snapshots: 0,
    responded: readApiResponse,
})

export async function requestApi<T>(path: PublicApiPath, { signal }: ApiOptions = {}): Promise<T> {
    signal?.throwIfAborted()
    const request = publicApi.Request<T, T>({
        url: path,
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
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
