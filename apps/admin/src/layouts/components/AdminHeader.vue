<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElIcon, ElMessage } from 'element-plus'
import distantRidges from '@/assets/header/distant-ridges.png'
import sunPeaks from '@/assets/header/sun-peaks.png'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
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
    <header class="admin-header">
        <img class="admin-header__landscape" :src="distantRidges" alt="" width="1040" height="145" />

        <div class="admin-header__brand">
            <img class="admin-header__brand-image" :src="sunPeaks" alt="" width="390" height="150" />
            <span>QQ 飞车手游 · 内部管理系统</span>
        </div>

        <div class="admin-header__actions">
            <ElButton text disabled aria-label="通知（暂未开放）">
                <Icon icon="ep:bell" width="22" aria-hidden="true" />
            </ElButton>
            <span class="admin-header__divider" aria-hidden="true"></span>

            <ElDropdown trigger="click" placement="bottom-end" :disabled="loggingOut">
                <ElButton class="admin-header__account" text :loading="loggingOut">
                    <Icon v-if="!loggingOut" icon="ep:user" width="22" aria-hidden="true" />
                    <span class="admin-header__account-name">{{ auth.admin?.displayName || '管理员' }}</span>
                    <Icon icon="ep:arrow-down" width="14" aria-hidden="true" />
                </ElButton>
                <template #dropdown>
                    <ElDropdownMenu>
                        <ElDropdownItem @click="router.push({ name: 'admin-profile' })">
                            <ElIcon aria-hidden="true"><Icon icon="ep:user" /></ElIcon>
                            个人中心
                        </ElDropdownItem>
                        <ElDropdownItem @click="logout">
                            <ElIcon aria-hidden="true"><Icon icon="ep:switch-button" /></ElIcon>
                            退出登录
                        </ElDropdownItem>
                    </ElDropdownMenu>
                </template>
            </ElDropdown>
        </div>
    </header>
</template>

<style scoped lang="scss">
.admin-header {
    --admin-header-paper: light-dark(#f6f2f0, var(--tk-color-bg-surface));

    position: relative;
    isolation: isolate;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 24px;
    min-height: 56px;
    padding-block: 7px;
    padding-inline: clamp(12px, 1vw, 18px) clamp(16px, 1.5vw, 28px);
    border-bottom: 1px solid var(--tk-color-border);
    background: var(--admin-header-paper);

    .admin-header__landscape {
        position: absolute;
        z-index: -1;
        inset-block-end: 0;
        inset-inline-end: clamp(204px, 16vw, 320px);
        width: clamp(300px, 25vw, 400px);
        height: auto;
        mix-blend-mode: multiply;
        opacity: 0.65;
        pointer-events: none;
    }

    .admin-header__brand {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        font-size: 21px;
        font-weight: 700;
        line-height: 1.25;

        .admin-header__brand-image {
            flex: none;
            width: 92px;
            height: auto;
        }
    }

    .admin-header__actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-inline-start: auto;

        .admin-header__divider {
            height: 20px;
            border-inline-start: 1px solid var(--tk-color-border);
        }

        .admin-header__account {
            min-height: 40px;
            padding-inline: 8px;
            color: var(--tk-color-text-primary);
            font-size: 16px;

            :deep(> span) {
                gap: 8px;
            }

            .admin-header__account-name {
                overflow: hidden;
                max-width: 10em;
                text-overflow: ellipsis;
            }
        }
    }

    @media (max-width: 900px) {
        .admin-header__landscape {
            display: none;
        }
    }

    @media (max-width: 640px) {
        .admin-header__brand {
            font-size: 18px;

            .admin-header__brand-image {
                width: 68px;
            }
        }
    }
}
</style>
