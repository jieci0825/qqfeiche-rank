import { tracks } from './tracks'
import type { Track, TrackMode } from './tracks'

export type RecordCategory = 'ranked' | 'pinnacle'
export type TrackLength = 'short' | 'medium' | 'long'

export interface TrackRecord {
    id: string
    track: Track
    category: RecordCategory
    length: TrackLength
    raceMode: TrackMode
    driver: {
        name: string
        avatar: string | null
        isChampion: boolean
    }
    team: {
        name: string
        badge: string | null
    }
    timeMs: number
    holdingDays: number
    updatedAt: string
    popularity: number
}

const driverProfiles = [
    { name: '夜风', team: '天竞' },
    { name: '阿泽', team: '极点' },
    { name: '星河', team: '逐风' },
    { name: '听雨', team: '凌云' },
    { name: '追光', team: '破晓' },
    { name: '白昼', team: '无界' },
    { name: '南山', team: '星火' },
    { name: '流年', team: '长空' },
]
const featuredNames = ['西部矿山', '11城']
const recordTracks = [
    ...featuredNames.flatMap(name => tracks.filter(track => track.name === name)),
    ...tracks.filter(track => !featuredNames.includes(track.name)),
]

// 以下为固定种子的演示记录，不代表真实成绩；赛道名称、星级与配图来自已有赛道数据。
const demoReferenceDate = Date.UTC(2026, 10, 16)

export const mockTrackRecords: TrackRecord[] = recordTracks.map((track, index) => {
    const profile = driverProfiles[index % driverProfiles.length]
    // 原始数据没有中图标签，演示时将未标记长图、短图的赛道暂归为中图。
    const length: TrackLength = track.tags.includes('短图')
        ? 'short'
        : track.tags.includes('长图') ? 'long' : 'medium'
    const holdingDays = index === 0 ? 128 : index === 1 ? 96 : 14 + (index * 19) % 181
    const timeMs = index === 0
        ? 83_480
        : index === 1
            ? 121_770
            : 65_000 + track.stars * 6_430 + (index * 3_491) % 47_500
                + (length === 'long' ? 30_000 : length === 'medium' ? 10_000 : 0)

    return {
        id: `track-record-${track.name}`,
        track,
        category: index % 3 === 2 ? 'pinnacle' : 'ranked',
        length,
        raceMode: track.modes.includes('竞速') ? '竞速' : track.modes[0] ?? '竞速',
        driver: {
            name: profile.name,
            avatar: null,
            isChampion: index % 8 === 0,
        },
        team: {
            name: profile.team,
            badge: null,
        },
        timeMs,
        holdingDays,
        updatedAt: new Date(demoReferenceDate - holdingDays * 86_400_000).toISOString().slice(0, 10),
        popularity: index === 0 ? 284_000 : index === 1 ? 221_000 : 5_400 + (index * 7_919) % 350_000,
    }
})
