<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import AdminHeader from './components/AdminHeader.vue'

const auth = useAuthStore()
const route = useRoute()
const dashboard = { name: 'admin-dashboard' }
const tracks = { name: 'admin-tracks' }
const eventsTitle = '赛事管理'
const eventsExpanded = ref(true)
const mobileNavExpanded = ref(false)
const upcomingSections = [
    { label: '用户管理', icon: 'ep:user' },
    { label: '数据统计', icon: 'ep:histogram' },
    { label: '系统设置', icon: 'ep:setting' },
]

watch(() => route.name, name => {
    if (name === tracks.name) eventsExpanded.value = true
})
</script>

<template>
    <div v-if="auth.isLoggedIn" class="admin-app">
        <AdminHeader class="admin-app__header" />

        <aside class="admin-sidebar">
            <button
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
                id="admin-sidebar-nav"
                class="admin-sidebar__nav"
                :class="{ 'is-expanded': mobileNavExpanded }"
                aria-label="后台导航"
            >
                <RouterLink class="admin-sidebar__item" :to="dashboard">
                    <Icon icon="ep:house" aria-hidden="true" />
                    首页
                </RouterLink>
                <div class="admin-sidebar__group">
                    <button
                        type="button"
                        class="admin-sidebar__item"
                        :aria-expanded="eventsExpanded"
                        aria-controls="admin-sidebar-events"
                        @click="eventsExpanded = !eventsExpanded"
                    >
                        <Icon icon="ep:trophy" aria-hidden="true" />
                        {{ eventsTitle }}
                        <Icon
                            class="admin-sidebar__chevron"
                            :class="{ 'is-expanded': eventsExpanded }"
                            icon="ep:arrow-right"
                            aria-hidden="true"
                        />
                    </button>
                    <div v-show="eventsExpanded" id="admin-sidebar-events" class="admin-sidebar__children">
                        <RouterLink class="admin-sidebar__item admin-sidebar__child" :to="tracks">
                            国服赛道记录
                        </RouterLink>
                        <button type="button" class="admin-sidebar__item admin-sidebar__child" disabled>
                            车手排行
                        </button>
                    </div>
                </div>
                <button
                    v-for="section in upcomingSections"
                    :key="section.label"
                    type="button"
                    class="admin-sidebar__item"
                    disabled
                >
                    <Icon :icon="section.icon" aria-hidden="true" />
                    {{ section.label }}
                </button>
            </nav>
        </aside>

        <main class="admin-main">
            <nav v-if="route.name !== dashboard.name" class="admin-main__breadcrumb" aria-label="面包屑导航">
                <ol>
                    <li>
                        <RouterLink :to="dashboard">首页</RouterLink>
                        <Icon icon="ep:arrow-right" aria-hidden="true" />
                    </li>
                    <li v-if="route.name === tracks.name">
                        {{ eventsTitle }}
                        <Icon icon="ep:arrow-right" aria-hidden="true" />
                    </li>
                    <li aria-current="page">{{ route.meta.title }}</li>
                </ol>
            </nav>
            <RouterView />
        </main>
    </div>
</template>

<style scoped lang="scss">
.admin-app {
    display: grid;
    grid-template-columns: 244px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    min-height: 100dvh;
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

        min-height: 640px;
        padding: 12px 12px 24px;
        border-inline-end: 1px solid var(--tk-color-border);
        background: var(--admin-sidebar-paper) url('@/assets/layout/sidebar-ink-landscape.webp') left bottom / 166% 100% no-repeat;
        color: var(--admin-sidebar-ink);

        .admin-sidebar__item {
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
            transition: background-color 140ms ease-out;

            &:where(:not(:disabled)) {
                cursor: pointer;

                &:hover {
                    background-color: var(--admin-sidebar-hover);
                }
            }

            &:disabled {
                color: color-mix(in srgb, var(--admin-sidebar-ink) 72%, var(--admin-sidebar-paper));
            }

            &:focus-visible {
                outline: 2px solid var(--admin-sidebar-ink);
                outline-offset: -2px;
            }

            &.router-link-exact-active {
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

            .admin-sidebar__group {
                .admin-sidebar__children {
                    display: grid;
                    gap: 2px;
                    margin-inline-start: 20px;
                    padding-inline-start: 9px;
                    border-inline-start: 1px solid var(--tk-color-border);

                    .admin-sidebar__child {
                        min-height: 40px;
                        font-size: 17px;
                    }
                }
            }
        }
    }

    .admin-main {
        min-width: 0;
        padding: 24px clamp(16px, 2.5vw, 36px);

        .admin-main__breadcrumb {
            margin-bottom: 24px;
            color: var(--tk-color-text-secondary);
            font-size: 14px;

            ol {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 0;
                padding: 0;
                list-style: none;

                li {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    a {
                        color: inherit;
                        text-underline-offset: 3px;
                    }
                }
            }
        }
    }

    @media (max-width: 768px) {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto auto 1fr;

        .admin-sidebar {
            min-height: 0;
            padding: 4px 16px;
            border-inline-end: 0;
            border-bottom: 1px solid var(--tk-color-border);
            background-image: none;

            .admin-sidebar__item {
                &.admin-sidebar__toggle {
                    display: flex;
                }
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
