<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logoUrl from '@/assets/record-board/qq-speed-logo-white.png'
import sealUrl from '@/assets/record-board/seal-guofu.svg?url'

const navigationItems = [
    { label: '记录榜单', routeName: 'records' },
    { label: '赛道大全', routeName: 'tracks' },
    { label: '车手排行', routeName: 'drivers' },
]
</script>

<template>
    <header class="client-header">
        <RouterLink
            class="client-header__brand"
            :to="{ name: 'records' }"
            aria-label="QQ 飞车手游 · 赛道国服记录首页"
        >
            <img
                class="client-header__logo"
                :src="logoUrl"
                alt="QQ 飞车手游"
            />
            <span
                class="client-header__divider"
                aria-hidden="true"
            ></span>
            <span class="client-header__title">
                赛道国服记录
                <img
                    class="client-header__seal"
                    :src="sealUrl"
                    alt=""
                />
            </span>
        </RouterLink>

        <nav
            class="client-header__nav"
            aria-label="主导航"
        >
            <RouterLink
                v-for="item in navigationItems"
                :key="item.routeName"
                class="client-header__nav-link"
                :to="{ name: item.routeName }"
                active-class="is-active"
            >
                <span class="client-header__nav-label">{{ item.label }}</span>
                <span
                    class="client-header__nav-glow"
                    aria-hidden="true"
                ></span>
            </RouterLink>
        </nav>
    </header>
</template>

<style scoped lang="scss">
.client-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: clamp(32px, calc(25vw - 240px), 268px);
    height: 78px;
    padding: 0 clamp(24px, 3.9vw, 80px);
    border-bottom: 1px solid var(--tk-color-border);
    background-color: var(--tk-color-header-bg);
    font-family: var(--tk-font-display);

    .client-header__brand {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 32px;
        color: var(--tk-color-text);
        text-decoration: none;

        &:focus-visible {
            outline: 2px solid var(--tk-color-primary);
            outline-offset: 4px;
        }

        .client-header__logo {
            width: 172px;
            height: auto;
        }

        .client-header__divider {
            width: 1px;
            height: 28px;
            background-color: var(--tk-color-text-secondary);
        }

        .client-header__title {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            font-size: 30px;
            font-weight: 700;
            line-height: 1.2;
            white-space: nowrap;

            .client-header__seal {
                width: 14px;
                height: 22px;
                margin-top: 2px;
            }
        }
    }

    .client-header__nav {
        display: flex;
        align-self: stretch;
        min-width: 0;

        .client-header__nav-link {
            position: relative;
            display: flex;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            width: clamp(156px, 10.74vw, 220px);
            color: var(--tk-color-text-secondary);
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 2px;
            text-decoration: none;
            white-space: nowrap;

            &::before {
                position: absolute;
                inset: 4px 0 10px;
                content: '';
                background: linear-gradient(
                    to bottom,
                    transparent,
                    color-mix(in srgb, var(--tk-color-primary) 24%, transparent)
                );
                box-shadow: inset 0 -2px var(--tk-color-primary);
                clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%);
                opacity: 0;
            }

            &:hover {
                color: var(--tk-color-primary);
            }

            &:focus-visible {
                outline: 2px solid var(--tk-color-primary);
                outline-offset: -4px;
            }

            &.is-active {
                color: var(--tk-color-primary);

                &::before {
                    opacity: 1;
                }

                .client-header__nav-glow {
                    opacity: 1;
                }
            }

            .client-header__nav-label {
                position: relative;
            }

            .client-header__nav-glow {
                position: absolute;
                bottom: 8px;
                left: 44%;
                width: 8px;
                height: 4px;
                border-radius: 50%;
                background-color: var(--tk-color-text);
                box-shadow:
                    0 0 6px 2px var(--tk-color-primary),
                    0 0 18px 6px
                        color-mix(
                            in srgb,
                            var(--tk-color-primary) 45%,
                            transparent
                        );
                opacity: 0;
                transform: translateX(-50%);
            }
        }
    }

    @media (max-width: 1100px) {
        flex-direction: column;
        gap: 0;
        height: auto;
        padding: 0 20px;

        .client-header__brand {
            min-height: 64px;
            gap: 20px;

            .client-header__logo {
                width: 144px;
            }

            .client-header__title {
                font-size: 28px;
            }
        }

        .client-header__nav {
            align-self: center;
            width: min(100%, 660px);
            height: 58px;

            .client-header__nav-link {
                flex: 1;
                width: auto;
                font-size: 22px;
            }
        }
    }

    @media (max-width: 480px) {
        padding: 0 12px;

        .client-header__brand {
            gap: 12px;

            .client-header__logo {
                width: 112px;
            }

            .client-header__divider {
                height: 22px;
            }

            .client-header__title {
                gap: 4px;
                font-size: 22px;

                .client-header__seal {
                    width: 11px;
                    height: 18px;
                }
            }
        }

        .client-header__nav {
            .client-header__nav-link {
                font-size: 18px;
                letter-spacing: 1px;
            }
        }
    }
}
</style>
