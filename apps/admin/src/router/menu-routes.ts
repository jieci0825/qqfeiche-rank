import type { RouteComponent, Router } from 'vue-router'
import type { AdminMenu } from '@/api'

declare module 'vue-router' {
    interface RouteMeta {
        title?: string
        requiresAuth?: boolean
        menuTrail?: AdminMenu[]
    }
}

const menuPages = import.meta.glob<RouteComponent>('/src/views/**/index.vue', { import: 'default' })
const placeholderPage = () => import('@/views/MenuPlaceholder.vue')

export function setUpMenuRoutes(router: Router, menus: AdminMenu[]) {
    const removeRoutes: (() => void)[] = []

    function register(items: AdminMenu[], ancestors: AdminMenu[]) {
        for (const menu of items) {
            const menuTrail = [...ancestors, menu]
            if (menu.path) {
                removeRoutes.push(router.addRoute('admin-layout', {
                    path: menu.path,
                    name: `admin-menu-${menu.key}`,
                    component: menuPages[`/src/views${menu.path}/index.vue`] ?? placeholderPage,
                    meta: { title: menu.title, menuTrail },
                }))
            }

            register(menu.children, menuTrail)
        }
    }

    register(menus, [])
    return () => removeRoutes.forEach(removeRoute => removeRoute())
}
