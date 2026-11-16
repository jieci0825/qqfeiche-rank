<script setup lang="ts">
import { RouterView } from 'vue-router'
import ClientHeader from './components/ClientHeader.vue'
</script>

<template>
    <div class="client-app">
        <ClientHeader />

        <main class="client-main">
            <div class="client-main__inner">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<style scoped lang="scss">
.client-app {
    --client-layout-gutter: 24px;

    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    color: var(--tk-color-text);
    background: var(--tk-color-bg) url('@/assets/record-board/ink-page-background.png') center top / cover no-repeat;

    .client-main {
        flex: 1;
        min-height: 0;
        overflow: auto;

        .client-main__inner {
            width: min(1080px, calc(100% - var(--client-layout-gutter) * 2));
            min-height: 100%;
            margin-inline: auto;
        }
    }

    @media (max-width: 1100px) {
        --client-layout-gutter: 20px;
    }

    @media (max-width: 480px) {
        --client-layout-gutter: 12px;
    }
}
</style>
