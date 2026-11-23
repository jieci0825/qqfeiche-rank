import { requestApi } from '../core/client'

export interface RecordIdentity {
    id: number
    name: string
}

export interface PublicTrack extends RecordIdentity {
    stars: number | null
    status: 'active' | 'archived'
    coverUrl: string | null
}

export interface RecordVersion {
    id: number
    versionId: number
    kind: 'set' | 'restore'
    timeMs: number
    achievedAt: string
    effectiveAt: string
    holdingMs: number
    holdingDays: number
    driver: RecordIdentity & { imageUrl: string | null }
    team: RecordIdentity | null
    car: RecordIdentity | null
    pet: RecordIdentity | null
    screenshotUrl: string | null
    videoUrl: string | null
}

export interface HistoricalVersion extends RecordVersion {
    state: 'current' | 'historical'
    endedAt: string | null
}

export interface TrackRecord {
    track: PublicTrack
    current: RecordVersion
}

export interface TrackRecordDetail {
    track: PublicTrack
    current: RecordVersion | null
    history: HistoricalVersion[]
    stats: {
        historicalRecordCount: number
        brokenCount: number
        currentHoldingMs: number
        longestHoldingMs: number
    }
}

export function listAllRecords(signal: AbortSignal) {
    return requestApi<{ items: TrackRecord[] }>('/api/public/records/all', { signal })
}

export function getTrackRecord(id: number, signal: AbortSignal) {
    return requestApi<TrackRecordDetail>(`/api/public/tracks/${id}`, { signal })
}
