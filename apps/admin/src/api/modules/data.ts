import { useAuthStore } from '@/stores/auth'
import { uploadImage } from '../core/image-upload'

export type DataResource = 'teams' | 'drivers' | 'cars' | 'pets'
export type DataStatus = 'active' | 'disabled' | 'archived'

export interface DataItem {
    id: number
    name: string
    status: DataStatus
    imageFileId?: number | null
    imageUrl?: string | null
    teamId?: number | null
    teamName?: string | null
    teamStatus?: DataStatus | null
    ecu?: string[]
}

export interface DataInput {
    name: string
    status?: Exclude<DataStatus, 'archived'>
    imageUploadTicket?: string
    teamId?: number | null
    ecu?: string[]
}

export interface TeamOption {
    id: number
    name: string
}

export function listDataItems(resource: DataResource, signal: AbortSignal) {
    return useAuthStore().request<{ items: DataItem[] }>(`/api/admin/${resource}`, { signal })
}

export function saveDataItem(resource: DataResource, input: DataInput, id: number | undefined, signal: AbortSignal) {
    const auth = useAuthStore()
    return id === undefined
        ? auth.request<{ item: DataItem }>(`/api/admin/${resource}`, { method: 'POST', body: input, signal })
        : auth.request<{ item: DataItem }>(`/api/admin/${resource}/${id}`, { method: 'PUT', body: input, signal })
}

export function archiveDataItem(resource: DataResource, id: number) {
    return useAuthStore().request<void>(`/api/admin/${resource}/${id}/archive`, { method: 'POST' })
}

export function listDriverTeamOptions(signal: AbortSignal) {
    return useAuthStore().request<{ teams: TeamOption[] }>('/api/admin/drivers/team-options', { signal })
}

export function uploadDataImage(resource: Exclude<DataResource, 'teams'>, label: string, file: File, signal: AbortSignal) {
    return uploadImage(`/api/admin/${resource}/image/upload`, label, file, signal)
}
