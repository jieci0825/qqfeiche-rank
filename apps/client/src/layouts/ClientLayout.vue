<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
    <div class="client-app">
        <header class="client-header">
            <div class="client-header__left">
                <RouterLink class="client-brand" to="/records" aria-label="QQ飞车手游国服记录榜">
                    <img class="client-brand__logo" src="/logo.png" alt="QQ飞车" />
                </RouterLink>

                <span class="client-header__divider" aria-hidden="true"></span>

                <span class="client-header__title">QQ飞车手游国服记录榜</span>

                <nav class="client-nav">
                    <RouterLink to="/records">记录榜</RouterLink>
                    <RouterLink to="/drivers">车手榜</RouterLink>
                    <RouterLink to="/teams">车队榜</RouterLink>
                    <RouterLink to="/stats">数据统计</RouterLink>
                </nav>
            </div>

            <div class="client-header__actions">
                <button class="client-guide" type="button">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4" />
                        <path d="M12 16.8h.01" />
                    </svg>
                    使用说明
                </button>

                <button class="client-contact" type="button">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8.5" r="3.5" />
                        <path d="M5 19c.8-3.2 3.6-5 7-5s6.2 1.8 7 5" />
                    </svg>
                    联系
                </button>
            </div>
        </header>

        <main class="client-main">
            <RouterView />
        </main>
    </div>
</template>
