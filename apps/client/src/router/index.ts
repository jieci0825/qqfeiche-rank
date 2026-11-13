import { createRouter, createWebHistory } from 'vue-router'
import ClientLayout from '@/layouts/ClientLayout.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: ClientLayout,
            children: [
                {
                    path: '',
                    redirect: { name: 'records' },
                },
                {
                    path: 'records',
                    name: 'records',
                    component: () => import('@/views/records/index.vue'),
                },
                {
                    path: 'drivers',
                    name: 'drivers',
                    component: () => import('@/views/drivers/index.vue'),
                },
                {
                    path: 'teams',
                    name: 'teams',
                    component: () => import('@/views/teams/index.vue'),
                },
                {
                    path: 'stats',
                    name: 'stats',
                    component: () => import('@/views/stats/index.vue'),
                },
            ],
        },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

export default router
