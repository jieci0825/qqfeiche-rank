<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Icon } from '@/icons'
</script>

<template>
    <div class="client-app">
        <header class="client-header">
            <div class="client-header__left">
                <RouterLink
                    class="client-brand"
                    to="/records"
                    aria-label="QQ飞车手游国服记录榜"
                >
                    <img
                        class="client-brand__logo"
                        src="/logo.png"
                        alt="QQ飞车"
                    />
                </RouterLink>

                <span
                    class="client-header__divider"
                    aria-hidden="true"
                ></span>

                <span class="client-header__title">QQ飞车手游国服记录榜</span>

                <nav class="client-nav">
                    <RouterLink to="/records">记录榜</RouterLink>
                    <RouterLink to="/drivers">车手榜</RouterLink>
                    <RouterLink to="/teams">车队榜</RouterLink>
                    <RouterLink to="/stats">数据统计</RouterLink>
                </nav>
            </div>

            <div class="client-header__actions">
                <button
                    class="client-guide"
                    type="button"
                >
                    <Icon
                        icon="ep:question-filled"
                        aria-hidden="true"
                    />
                    使用说明
                </button>

                <el-button
                    class="client-contact"
                    plain
                >
                    <Icon
                        icon="ep:user"
                        aria-hidden="true"
                    />
                    联系
                </el-button>
            </div>
        </header>

        <main class="client-main">
            <div class="client-container">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<style scoped lang="scss">
// C 端布局：header 固定高度，main 撑满剩余空间。
.client-app {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;

    .client-header {
        display: flex;
        flex: 0 0 64px;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 0 24px;
        border-bottom: 1px solid var(--tk-color-border);
        background: var(--tk-color-bg-surface);

        .client-header__left {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 16px;

            .client-brand {
                display: inline-flex;
                flex-shrink: 0;
                align-items: center;
                text-decoration: none;

                .client-brand__logo {
                    display: block;
                    width: auto;
                    height: 40px;
                }
            }

            .client-header__divider {
                flex-shrink: 0;
                width: 1px;
                height: 24px;
                background: var(--tk-color-border);
            }

            .client-header__title {
                flex-shrink: 0;
                color: var(--tk-color-text-primary);
                font-size: 18px;
                font-weight: 700;
                white-space: nowrap;
            }

            .client-nav {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: 16px;

                a {
                    padding: 8px 16px;
                    border-radius: 8px;
                    color: var(--tk-color-text-primary);
                    font-size: 15px;
                    font-weight: 500;
                    white-space: nowrap;
                    text-decoration: none;
                    transition:
                        background-color 0.2s ease,
                        color 0.2s ease;

                    &:hover {
                        background: var(--tk-color-bg-hover);
                    }

                    &.router-link-active {
                        background: var(--tk-color-primary-subtle);
                        color: var(--tk-color-primary);
                        font-weight: 600;
                    }
                }
            }
        }

        .client-header__actions {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            gap: 16px;

            svg {
                width: 18px;
                height: 18px;
            }

            .client-guide {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 4px;
                border: none;
                background: none;
                color: var(--tk-color-text-secondary);
                font-size: 14px;
                white-space: nowrap;
                cursor: pointer;
                transition: color 0.2s ease;

                &:hover {
                    color: var(--tk-color-text-primary);
                }
            }

            .client-contact {
                :deep(> span) {
                    gap: 6px;
                }
            }
        }
    }

    .client-main {
        display: flex;
        flex: 1;
        flex-direction: column;
        width: 100%;
        padding: 20px;
        overflow: hidden;

        .client-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 1280px;
            height: 100%;
            margin: 0 auto;
            border: 1px solid var(--tk-color-border);
            background: var(--tk-color-bg-surface);
            overflow: hidden;
        }
    }
}
</style>
