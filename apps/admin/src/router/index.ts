import { createRouter, createWebHistory, RouterView } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'admin-login',
            component: () => import('@/views/login/index.vue'),
            meta: { title: '管理员登录' },
        },
        {
            path: '/',
            name: 'admin-layout',
            component: AdminLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    name: 'admin-dashboard',
                    component: () => import('@/views/dashboard/index.vue'),
                    meta: { title: '概览' },
                },
                {
                    path: 'profile',
                    name: 'admin-profile',
                    component: () => import('@/views/profile/index.vue'),
                    meta: { title: '个人中心' },
                },
                {
                    // 等待菜单加载后再决定是否回首页，保留直接访问的原始地址。
                    path: ':pathMatch(.*)*',
                    name: 'admin-unmatched',
                    component: RouterView,
                },
            ],
        },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

export function adminDestination(redirect: unknown) {
    if (typeof redirect === 'string' && redirect !== '/' && redirect.startsWith('/') && !/^\/[\t\r\n]*[\\/]/.test(redirect)) {
        if (router.resolve(redirect).meta.requiresAuth) return redirect
    }
    return '/records'
}

router.beforeEach(async to => {
    const auth = useAuthStore()
    await auth.restoreSession()

    if (to.name === 'admin-login') {
        if (auth.isLoggedIn) return adminDestination(to.query.redirect)
        return
    }
    if (!to.meta.requiresAuth) return

    if (auth.isLoggedIn) await auth.loadMenus().catch(() => undefined)
    if (!auth.isLoggedIn) {
        return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    if (auth.menus === null) return

    const resolved = router.resolve(to.fullPath)
    if (resolved.name === 'admin-unmatched') return { name: 'admin-dashboard', replace: true }
    if (resolved.matched.at(-1) !== to.matched.at(-1)) {
        return { path: to.path, query: to.query, hash: to.hash, replace: true }
    }
})

export default router
