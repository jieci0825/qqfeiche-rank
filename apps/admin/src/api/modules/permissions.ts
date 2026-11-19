import { useAuthStore } from '@/stores/auth'

export interface Permission {
    code: string
    menuId: number
    label: string
    kind: 'page' | 'action'
}

export function listPermissions(signal?: AbortSignal) {
    return useAuthStore().request<{ permissions: Permission[] }>('/api/admin/permissions', { signal })
}
