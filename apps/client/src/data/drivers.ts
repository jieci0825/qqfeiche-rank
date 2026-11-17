export interface RankedDriver {
    id: string
    name: string
    avatar: string | null
    team: {
        name: string
        badge: string | null
    }
    nationalRecordCount: number
}

// 固定演示数据，不代表真实国服数量；后续可替换为接口返回值。
const profiles = [
    { name: '夜风', team: '天竞', count: 56 },
    { name: '阿泽', team: '极点', count: 34 },
    { name: '星河', team: '逐风', count: 29 },
    { name: '听雨', team: '凌云', count: 27 },
    { name: '追光', team: '破晓', count: 26 },
    { name: '白昼', team: '无界', count: 24 },
    { name: '南山', team: '星火', count: 23 },
    { name: '云峰', team: '天竞', count: 21 },
    { name: '慕歌', team: '极点', count: 20 },
    { name: '清风', team: '逐风', count: 19 },
    { name: '长夜', team: '凌云', count: 18 },
    { name: '远川', team: '破晓', count: 17 },
]

export const mockRankedDrivers: RankedDriver[] = profiles.map((profile, index) => ({
    id: `driver-${index + 1}`,
    name: profile.name,
    avatar: null,
    team: { name: profile.team, badge: null },
    nationalRecordCount: profile.count,
}))
