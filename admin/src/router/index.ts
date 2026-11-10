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
                    props: {
                        title: '赛道管理',
                        description: '赛道的新增、编辑、归档与排序将在这里实现。',
                    },
                    meta: { title: '赛道管理' },
                },
                {
                    path: 'tags',
                    name: 'admin-tags',
                    component: () => import('@/views/AdminSectionView.vue'),
                    props: {
                        title: '分类管理',
                        description: '难度、场景、长度、地形等分类维度将在这里维护。',
                    },
                    meta: { title: '分类管理' },
                },
                {
                    path: 'people',
                    name: 'admin-people',
                    component: () => import('@/views/AdminSectionView.vue'),
                    props: {
                        title: '车手 / 车队',
                        description: '车手与车队的资料、改名和关联记录将在这里管理。',
                    },
                    meta: { title: '车手 / 车队' },
                },
                {
                    path: 'records',
                    name: 'admin-records',
                    component: () => import('@/views/AdminSectionView.vue'),
                    props: {
                        title: '成绩管理',
                        description: '成绩筛选、作废与历史记录将在这里管理。',
                    },
                    meta: { title: '成绩管理' },
                },
                {
                    path: 'records/new',
                    name: 'admin-record-new',
                    component: () => import('@/views/AdminSectionView.vue'),
                    props: {
                        title: '录入成绩',
                        description: '录入表单与成绩校验将在这里实现。',
                    },
                    meta: { title: '录入成绩' },
                },
                {
                    path: 'logs',
                    name: 'admin-logs',
                    component: () => import('@/views/AdminSectionView.vue'),
                    props: {
                        title: '操作日志',
                        description: '所有写操作的操作人、时间、对象与变更详情将在这里展示。',
                    },
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
