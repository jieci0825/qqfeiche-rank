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
                    path: 'tracks/:id',
                    name: 'track-detail',
                    component: () => import('@/views/records/TrackRecordDetail.vue'),
                },
                {
                    path: 'rankings',
                    name: 'rankings',
                    component: () => import('@/views/rankings/index.vue'),
                },
                {
                    path: 'drivers',
                    redirect: { name: 'rankings' },
                },
                {
                    path: 'about',
                    name: 'about',
                    component: () => import('@/views/about/index.vue'),
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
