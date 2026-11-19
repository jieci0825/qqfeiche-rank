import { useAuthStore } from '@/stores/auth'
import { ApiError } from '../core/errors'

export interface TrackInput {
    name: string
    coverUploadTicket?: string | null
    sortOrder: number
}

export interface Track extends Omit<TrackInput, 'coverUploadTicket'> {
    id: number
    coverFileId: number | null
    coverUrl: string | null
    status: 'active' | 'archived'
    createdAt: string
    updatedAt: string
}

const tracksPath = '/api/admin/tracks'

export function listTracks(signal: AbortSignal) {
    return useAuthStore().request<{ tracks: Track[] }>(tracksPath, { signal })
}

export function saveTrack(input: TrackInput, id?: number, signal?: AbortSignal) {
    const auth = useAuthStore()
    if (id === undefined) {
        return auth.request<{ track: Track }>(tracksPath, { method: 'POST', body: input, signal })
    }
    return auth.request<{ track: Track }>(`${tracksPath}/${id}`, { method: 'PUT', body: input, signal })
}

export function archiveTrack(id: number) {
    return useAuthStore().request<void>(`${tracksPath}/${id}/archive`, { method: 'POST' })
}

export async function uploadTrackCover(file: File, signal: AbortSignal) {
    const auth = useAuthStore()
    const { uploadUrl, fields, ticket } = await auth.request<{
        uploadUrl: string
        fields: Record<string, string>
        ticket: string
    }>(`${tracksPath}/cover/upload`, {
        method: 'POST',
        body: { size: file.size, contentType: file.type, originalName: file.name },
        signal,
    })

    const form = new FormData()
    for (const [name, value] of Object.entries(fields)) form.append(name, value)
    form.append('file', file)

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    }).catch(() => {
        signal.throwIfAborted()
        throw new ApiError(0, 'COS_UPLOAD_FAILED', '连接 COS 失败，请稍后重试', 0)
    })
    if (!response.ok) {
        throw new ApiError(response.status, 'COS_UPLOAD_FAILED', '上传封面失败，请重新提交', 0)
    }

    return ticket
}
