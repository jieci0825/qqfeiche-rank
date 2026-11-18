import { useAuthStore } from '@/stores/auth'

export interface TrackInput {
    name: string
    coverUrl: string | null
    description: string | null
    sortOrder: number
}

export interface Track extends TrackInput {
    id: number
    status: 'active' | 'archived'
    createdAt: string
    updatedAt: string
}

const tracksPath = '/api/admin/tracks'

export function listTracks(signal: AbortSignal) {
    return useAuthStore().request<{ tracks: Track[] }>(tracksPath, { signal })
}

export function saveTrack(input: TrackInput, id?: number) {
    const auth = useAuthStore()
    if (id === undefined) {
        return auth.request<{ track: Track }>(tracksPath, { method: 'POST', body: input })
    }
    return auth.request<{ track: Track }>(`${tracksPath}/${id}`, { method: 'PUT', body: input })
}

export function archiveTrack(id: number) {
    return useAuthStore().request<void>(`${tracksPath}/${id}/archive`, { method: 'POST' })
}
