import { createRouter, createWebHistory } from 'vue-router'
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
                    path: 'tracks',
                    name: 'admin-tracks',
                    component: () => import('@/views/tracks/index.vue'),
                    meta: { title: '赛道管理' },
                },
                {
                    path: 'tags',
                    name: 'admin-tags',
                    component: () => import('@/views/tags/index.vue'),
                    meta: { title: '分类管理' },
                },
                {
                    path: 'people',
                    name: 'admin-people',
                    component: () => import('@/views/people/index.vue'),
                    meta: { title: '车手 / 车队' },
                },
                {
                    path: 'records',
                    name: 'admin-records',
                    component: () => import('@/views/records/index.vue'),
                    meta: { title: '成绩管理' },
                },
                {
                    path: 'records/new',
                    name: 'admin-record-new',
                    component: () => import('@/views/records/new/index.vue'),
                    meta: { title: '录入成绩' },
                },
                {
                    path: 'logs',
                    name: 'admin-logs',
                    component: () => import('@/views/logs/index.vue'),
                    meta: { title: '操作日志' },
                },
            ],
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

export function adminDestination(redirect: unknown) {
    if (typeof redirect === 'string' && redirect.startsWith('/') && !/^\/[\\/]/.test(redirect)) {
        if (router.resolve(redirect).meta.requiresAuth) return redirect
    }
    return { name: 'admin-dashboard' }
}

router.beforeEach(async to => {
    const auth = useAuthStore()
    await auth.restoreSession()

    if (to.meta.requiresAuth && !auth.isLoggedIn) {
        return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    if (to.name === 'admin-login' && auth.isLoggedIn) return adminDestination(to.query.redirect)
})

export default router
