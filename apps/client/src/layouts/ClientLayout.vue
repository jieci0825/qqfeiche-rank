<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Icon } from '@/icons'
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
                    <Icon icon="ep:question-filled" aria-hidden="true" />
                    使用说明
                </button>

                <button class="client-contact" type="button">
                    <Icon icon="ep:user" aria-hidden="true" />
                    联系
                </button>
            </div>
        </header>

        <main class="client-main">
            <RouterView />
        </main>
    </div>
</template>
