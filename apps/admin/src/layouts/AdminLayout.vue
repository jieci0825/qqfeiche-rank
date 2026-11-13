<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Icon } from '@/icons'

const route = useRoute()
const auth = useAuthStore()
const activeMenu = computed(() => route.path)
const clientUrl = import.meta.env.DEV ? 'http://localhost:5173/' : '/'

const menus = [
    { path: '/', label: '概览' },
    { path: '/tracks', label: '赛道管理' },
    { path: '/tags', label: '分类管理' },
    { path: '/people', label: '车手 / 车队' },
    { path: '/records', label: '成绩管理' },
    { path: '/logs', label: '操作日志' },
]
</script>

<template>
    <div class="admin-app">
        <aside class="admin-aside">
            <RouterLink class="admin-brand" to="/">
                <span class="admin-brand__mark">Q</span>
                <span>榜单管理</span>
            </RouterLink>

            <el-menu class="admin-menu" :default-active="activeMenu" router>
                <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
                    {{ item.label }}
                </el-menu-item>
            </el-menu>

            <a class="admin-back" :href="clientUrl">
                <Icon icon="ep:arrow-left" aria-hidden="true" />
                返回 C 端
            </a>
        </aside>

        <div class="admin-content">
            <header class="admin-header">
                <div>
                    <p class="admin-header__eyebrow">QQ 飞车手游 · 国服记录榜</p>
                    <h1 class="admin-header__title">{{ route.meta.title ?? '后台管理' }}</h1>
                </div>
                <el-tag :type="auth.isLoggedIn ? 'success' : 'info'" effect="plain">
                    {{ auth.isLoggedIn ? '已登录' : '未登录' }}
                </el-tag>
            </header>

            <main class="admin-main">
                <RouterView />
            </main>
        </div>
    </div>
</template>
