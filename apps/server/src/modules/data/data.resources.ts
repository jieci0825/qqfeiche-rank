import type { ImageUploadPurpose } from '../uploads/image-uploads.ts'

export interface DataResource {
    entity: string
    label: string
    image?: ImageUploadPurpose
}

export const dataResources = {
    teams: { entity: 'team', label: '车队' },
    drivers: { entity: 'driver', label: '车手', image: { directory: 'drivers/avatars', label: '车手头像' } },
    cars: { entity: 'car', label: '赛车', image: { directory: 'cars/previews', label: '赛车预览图' } },
    pets: { entity: 'pet', label: '宠物', image: { directory: 'pets/previews', label: '宠物预览图' } },
} as const satisfies Record<string, DataResource>

export type DataResourceKey = keyof typeof dataResources
