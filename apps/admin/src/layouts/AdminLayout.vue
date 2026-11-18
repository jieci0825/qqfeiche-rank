<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loggingOut = ref(false)

async function logout() {
    loggingOut.value = true
    try {
        await auth.logout()
    } catch {
        ElMessage.error('退出请求失败，服务端会话撤销未确认')
    } finally {
        loggingOut.value = false
    }
}
</script>

<template>
    <div v-if="auth.isLoggedIn" class="admin-app">
        <header class="admin-header">
            <nav class="admin-header__nav" aria-label="后台导航">
                <RouterLink :to="{ name: 'admin-dashboard' }">概览</RouterLink>
                <RouterLink :to="{ name: 'admin-tracks' }">赛道管理</RouterLink>
            </nav>
            <div class="admin-header__account">
                <span>{{ auth.admin?.displayName }}</span>
                <el-button size="small" :loading="loggingOut" @click="logout">退出登录</el-button>
            </div>
        </header>

        <main class="admin-main">
            <RouterView />
        </main>
    </div>
</template>
