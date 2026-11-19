import { useAuthStore } from '@/stores/auth'
import type { AdminMenu } from './auth'

export interface MenuInput {
    title: string
    icon?: string | null
    sortOrder: number
    isVisible: boolean
}

const menusPath = '/api/admin/menus'

export function listMenus(signal?: AbortSignal) {
    return useAuthStore().request<{ menus: AdminMenu[] }>(menusPath, { signal })
}

export function updateMenu(id: number, input: MenuInput) {
    return useAuthStore().request<{ menu: Omit<AdminMenu, 'children'> }>(`${menusPath}/${id}`, { method: 'PUT', body: input })
}
