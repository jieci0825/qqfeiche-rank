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

<style scoped lang="scss">
.admin-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100dvh;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);

    .admin-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 20px;
        min-height: 50px;
        padding: 8px clamp(12px, 3vw, 32px);
        border-bottom: 1px solid var(--el-border-color-light);
        background: var(--el-bg-color);

        .admin-header__nav,
        .admin-header__account {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 14px;
        }

        .admin-header__nav {
            a {
                color: var(--el-text-color-regular);
                text-decoration: none;

                &:hover,
                &.router-link-exact-active {
                    color: var(--el-color-primary);
                }
            }
        }
    }

    .admin-main {
        flex: 1;
        width: min(100%, 1200px);
        margin: 0 auto;
        padding: 24px clamp(12px, 3vw, 32px);
    }
}
</style>
