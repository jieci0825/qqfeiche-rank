export const rankingCategories = [
    { value: 'driver', label: '车手', unit: '位' },
    { value: 'car', label: '赛车', unit: '辆' },
    { value: 'pet', label: '宠物', unit: '只' },
] as const

export type RankingCategory = typeof rankingCategories[number]['value']

interface RankingItemBase {
    id: string
    name: string
    image: string | null
    nationalRecordCount: number
}

export type RankingItem = RankingItemBase & (
    | { category: 'driver'; team: { name: string; badge: string | null } }
    | { category: 'car' | 'pet'; team?: never }
)

// 固定演示数据，不代表真实国服数量；后续可替换为接口返回值。
const driverProfiles = [
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

const carProfiles = [
    { name: '逐日', count: 68 },
    { name: '凌霄', count: 51 },
    { name: '星芒', count: 43 },
    { name: '破晓之翼', count: 36 },
    { name: '流光', count: 31 },
    { name: '银翼', count: 28 },
    { name: '疾影', count: 25 },
    { name: '苍穹', count: 22 },
    { name: '极夜', count: 18 },
    { name: '追风者', count: 15 },
]

const petProfiles = [
    { name: '星愿灵狐', count: 62 },
    { name: '逐风白虎', count: 47 },
    { name: '月影灵猫', count: 38 },
    { name: '晨曦精灵', count: 32 },
    { name: '云间青鸾', count: 27 },
    { name: '流萤', count: 23 },
    { name: '雪团', count: 19 },
    { name: '墨羽', count: 14 },
]

export const mockRankings: Record<RankingCategory, RankingItem[]> = {
    driver: driverProfiles.map((profile, index) => ({
        id: `driver-${index + 1}`,
        category: 'driver',
        name: profile.name,
        image: null,
        team: { name: profile.team, badge: null },
        nationalRecordCount: profile.count,
    })),
    car: carProfiles.map((profile, index) => ({
        id: `car-${index + 1}`,
        category: 'car',
        name: profile.name,
        image: null,
        nationalRecordCount: profile.count,
    })),
    pet: petProfiles.map((profile, index) => ({
        id: `pet-${index + 1}`,
        category: 'pet',
        name: profile.name,
        image: null,
        nationalRecordCount: profile.count,
    })),
}
