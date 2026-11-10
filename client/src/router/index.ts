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
                    name: 'home',
                    component: () => import('@/views/HomeView.vue'),
                },
                {
                    path: 'about',
                    name: 'about',
                    component: () => import('@/views/AboutView.vue'),
                },
                {
                    path: ':pathMatch(.*)*',
                    name: 'not-found',
                    component: () => import('@/views/NotFoundView.vue'),
                },
            ],
        },
    ],
    scrollBehavior: () => ({ top: 0 }),
})

export default router
