import { useAuthStore } from '@/stores/auth'
import { uploadImage } from '../core/image-upload'

export type RecordState = 'current' | 'historical' | 'voided'
export type RecordVoidReason = 'bug' | 'reset' | 'cheat' | 'boost' | 'mistake' | 'other'

export interface RecordItem {
    id: number
    trackId: number
    trackName: string
    trackCoverUrl: string | null
    driverId: number
    driverName: string
    teamId: number | null
    teamName: string | null
    carId: number | null
    carName: string | null
    petId: number | null
    petName: string | null
    ecu: string[]
    timeMs: number
    achievedAt: string
    screenshotFileId: number | null
    screenshotUrl: string | null
    videoUrl: string | null
    note: string | null
    state: RecordState
    effectiveAt: string | null
    createdAt: string
    createdByName: string | null
    voidReason: RecordVoidReason | null
    voidNote: string | null
    voidedAt: string | null
    voidedByName: string | null
}

export interface RecordDetail extends RecordItem {
    versions: { id: number; kind: 'set' | 'restore'; effectiveAt: string; operatorName: string | null }[]
}

export interface RecordOption {
    id: number
    name: string
}

export interface RecordOptions {
    tracks: (RecordOption & { coverUrl: string | null })[]
    drivers: (RecordOption & { teamId: number | null })[]
    teams: RecordOption[]
    cars: (RecordOption & { ecu: string[] })[]
    pets: RecordOption[]
}

export interface RecordMetadata {
    driverId: number
    teamId: number | null
    carId: number | null
    petId: number | null
    ecu: string[]
    videoUrl: string | null
    note: string | null
    screenshotUploadTicket?: string | null
}

export interface RecordInput extends RecordMetadata {
    trackId: number
    timeMs: number
    achievedAt: string
}

export interface CurrentRecord {
    versionId: number
    id: number
    driverName: string
    timeMs: number
    achievedAt: string
    effectiveAt: string
}

export interface RecordVoidImpact {
    effect: 'unchanged' | 'restore' | 'empty'
    current: CurrentRecord | null
    recovery: CurrentRecord | null
}

export function listRecords(query: { q: string; state: RecordState | 'all'; page: number }, signal: AbortSignal) {
    const params = new URLSearchParams({ q: query.q, state: query.state, page: String(query.page) })
    return useAuthStore().request<{ items: RecordItem[]; total: number; page: number; pageSize: number }>(
        `/api/admin/records?${params}`, { signal },
    )
}

export function getRecord(id: number, signal: AbortSignal) {
    return useAuthStore().request<{ record: RecordDetail }>(`/api/admin/records/${id}`, { signal })
}

export function getRecordOptions(signal: AbortSignal) {
    return useAuthStore().request<RecordOptions>('/api/admin/records/options', { signal })
}

export function getCurrentRecord(trackId: number, signal: AbortSignal) {
    return useAuthStore().request<{ current: CurrentRecord | null }>(`/api/admin/records/current?trackId=${trackId}`, { signal })
}

export function createRecord(input: RecordInput, signal: AbortSignal) {
    return useAuthStore().request<{ record: RecordDetail }>('/api/admin/records', { method: 'POST', body: input, signal })
}

export function updateRecord(id: number, input: RecordMetadata, signal: AbortSignal) {
    return useAuthStore().request<{ record: RecordDetail }>(`/api/admin/records/${id}`, { method: 'PUT', body: input, signal })
}

export function previewRecordVoid(id: number, signal: AbortSignal) {
    return useAuthStore().request<RecordVoidImpact>(`/api/admin/records/${id}/void-preview`, { signal })
}

export function voidRecord(id: number, reason: RecordVoidReason, note: string, impact: RecordVoidImpact, signal: AbortSignal) {
    const body = { reason, note, currentVersionId: impact.current?.versionId ?? null, recoveryVersionId: impact.recovery?.versionId ?? null }
    return useAuthStore().request<{ record: RecordDetail; current: CurrentRecord | null }>(
        `/api/admin/records/${id}/void`, { method: 'POST', body, signal },
    )
}

export function uploadRecordScreenshot(file: File, signal: AbortSignal) {
    return uploadImage('/api/admin/records/screenshot/upload', '成绩截图', file, signal)
}
