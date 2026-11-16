import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'admin-login',
            component: () => import('@/views/AdminLoginView.vue'),
            meta: { title: '管理员登录' },
        },
        {
            path: '/',
            component: AdminLayout,
            children: [
                {
                    path: '',
                    name: 'admin-dashboard',
                    component: () => import('@/views/AdminDashboardView.vue'),
                    meta: { title: '概览' },
                },
                {
                    path: 'tracks',
                    name: 'admin-tracks',
                    component: () => import('@/views/AdminSectionView.vue'),
                    meta: { title: '赛道管理' },
                },
                {
                    path: 'tags',
                    name: 'admin-tags',
                    component: () => import('@/views/AdminSectionView.vue'),
                    meta: { title: '分类管理' },
                },
                {
                    path: 'people',
                    name: 'admin-people',
                    component: () => import('@/views/AdminSectionView.vue'),
                    meta: { title: '车手 / 车队' },
                },
                {
                    path: 'records',
                    name: 'admin-records',
                    component: () => import('@/views/AdminSectionView.vue'),
                    meta: { title: '成绩管理' },
                },
                {
                    path: 'records/new',
                    name: 'admin-record-new',
                    component: () => import('@/views/AdminSectionView.vue'),
                    meta: { title: '录入成绩' },
                },
                {
                    path: 'logs',
                    name: 'admin-logs',
                    component: () => import('@/views/AdminSectionView.vue'),
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

export default router
