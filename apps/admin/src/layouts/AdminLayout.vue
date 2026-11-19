<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import AdminHeader from './components/AdminHeader.vue'
import AdminSidebarItem from './components/AdminSidebarItem.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const mainContent = ref<HTMLElement | null>(null)
const mobileNavExpanded = ref(false)
const retrying = ref(false)

watch(() => route.fullPath, () => {
    if (mainContent.value) mainContent.value.scrollTop = 0
}, { flush: 'post' })

async function retryMenus() {
    retrying.value = true
    try {
        await router.replace({ path: route.path, query: route.query, hash: route.hash, force: true })
    } finally {
        retrying.value = false
    }
}
</script>

<template>
    <div v-if="auth.isLoggedIn" class="admin-app">
        <AdminHeader class="admin-app__header" />

        <aside class="admin-sidebar">
            <button
                v-if="auth.menus?.length"
                type="button"
                class="admin-sidebar__item admin-sidebar__toggle"
                :aria-expanded="mobileNavExpanded"
                aria-controls="admin-sidebar-nav"
                @click="mobileNavExpanded = !mobileNavExpanded"
            >
                后台导航
                <Icon
                    class="admin-sidebar__chevron"
                    :class="{ 'is-expanded': mobileNavExpanded }"
                    icon="ep:arrow-right"
                    aria-hidden="true"
                />
            </button>
            <nav
                v-if="auth.menus?.length"
                id="admin-sidebar-nav"
                class="admin-sidebar__nav"
                :class="{ 'is-expanded': mobileNavExpanded }"
                aria-label="后台导航"
            >
                <AdminSidebarItem v-for="menu in auth.menus" :key="menu.id" :menu="menu" />
            </nav>
        </aside>

        <main class="admin-main">
            <div ref="mainContent" class="admin-main__content">
                <div v-if="auth.menus === null">
                    <p role="alert">菜单加载失败，请重试。</p>
                    <el-button :loading="retrying" @click="retryMenus">重试</el-button>
                </div>
                <RouterView v-else />
            </div>
        </main>
    </div>
</template>

<style scoped lang="scss">
.admin-app {
    display: grid;
    grid-template-columns: 244px minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    height: 100dvh;
    overflow: hidden;
    background: var(--tk-color-bg-page);
    color: var(--tk-color-text-primary);

    .admin-app__header {
        grid-column: 1 / -1;
    }

    .admin-sidebar {
        --admin-sidebar-paper: #f5f2ed;
        --admin-sidebar-ink: #211f1d;
        --admin-sidebar-hover: color-mix(in srgb, var(--admin-sidebar-ink) 5%, transparent);
        --admin-sidebar-selected: color-mix(in srgb, var(--admin-sidebar-ink) 9%, transparent);

        overflow-y: auto;
        padding: 12px 12px 24px;
        border-inline-end: 1px solid var(--tk-color-border);
        background: var(--admin-sidebar-paper) url('@/assets/layout/sidebar-ink-landscape.webp') left bottom / 166% 100% no-repeat;
        color: var(--admin-sidebar-ink);

        :deep(.admin-sidebar__item) {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            min-height: 44px;
            padding: 6px 12px;
            border: 0;
            border-radius: var(--tk-radius-large);
            background: transparent;
            color: inherit;
            font-size: 18px;
            font-weight: 500;
            line-height: 1.3;
            text-align: start;
            text-decoration: none;
            cursor: pointer;
            transition: background-color 140ms ease-out;

            &:hover {
                background-color: var(--admin-sidebar-hover);
            }

            &:focus-visible {
                outline: 2px solid var(--admin-sidebar-ink);
                outline-offset: -2px;
            }

            &.is-active {
                background-color: var(--admin-sidebar-selected);
                font-weight: 600;
            }

            svg {
                flex: none;
                font-size: 18px;

                &.admin-sidebar__chevron {
                    margin-inline-start: auto;
                    font-size: 14px;
                    transition: transform 180ms ease-out;

                    &.is-expanded {
                        transform: rotate(90deg);
                    }
                }
            }

            &.admin-sidebar__toggle {
                display: none;
            }

            &.admin-sidebar__expand {
                width: auto;
            }

            @media (prefers-reduced-motion: reduce) {
                svg.admin-sidebar__chevron {
                    transition: none;
                }
            }
        }

        .admin-sidebar__nav {
            display: flex;
            flex-direction: column;
            gap: 4px;

            :deep(.admin-sidebar__entry) {
                .admin-sidebar__row {
                    display: flex;
                }

                .admin-sidebar__children {
                    display: grid;
                    gap: 2px;
                    margin-inline-start: 20px;
                    padding-inline-start: 9px;
                    border-inline-start: 1px solid var(--tk-color-border);

                    .admin-sidebar__item {
                        min-height: 40px;
                        font-size: 17px;
                    }
                }
            }
        }
    }

    .admin-main {
        min-width: 0;
        overflow: hidden;
        background: var(--tk-color-bg-page) url('@/assets/layout/main-ink-landscape.webp') center / 100% 100% no-repeat;

        html.dark & {
            background-image: none;
        }

        .admin-main__content {
            height: 100%;
            overflow: auto;
            padding: 24px clamp(16px, 2.5vw, 36px);
            scrollbar-width: none;
        }
    }

    @media (max-width: 768px) {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto auto minmax(0, 1fr);

        .admin-sidebar {
            max-height: 50dvh;
            padding: 4px 16px;
            border-inline-end: 0;
            border-bottom: 1px solid var(--tk-color-border);
            background-image: none;

            :deep(.admin-sidebar__toggle) {
                display: flex;
            }

            .admin-sidebar__nav {
                padding-block-end: 8px;

                &:not(.is-expanded) {
                    display: none;
                }
            }
        }
    }
}
</style>
