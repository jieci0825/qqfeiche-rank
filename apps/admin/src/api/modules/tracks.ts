import { useAuthStore } from '@/stores/auth'
import { uploadImage } from '../core/image-upload'

type TrackStatus = 'active' | 'disabled' | 'archived'

export interface TrackInput {
    name: string
    stars: number | null
    coverUploadTicket?: string | null
    status?: Exclude<TrackStatus, 'archived'>
}

export interface Track extends Omit<TrackInput, 'coverUploadTicket' | 'status'> {
    id: number
    coverFileId: number | null
    coverUrl: string | null
    status: TrackStatus
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

export function uploadTrackCover(file: File, signal: AbortSignal) {
    return uploadImage(`${tracksPath}/cover/upload`, '封面', file, signal)
}
