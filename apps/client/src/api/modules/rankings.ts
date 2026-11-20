import { requestApi } from '../core/client'
import type { RecordIdentity } from './records'

export type RankingCategory = 'driver' | 'car' | 'pet'

export interface RankingItem extends RecordIdentity {
    category: RankingCategory
    imageUrl: string | null
    team: RecordIdentity | null
    nationalRecordCount: number
    rank: number
}

export function listRankings(category: RankingCategory, signal: AbortSignal) {
    return requestApi<{ items: RankingItem[]; total: number }>(`/api/public/rankings?category=${category}`, { signal })
}
