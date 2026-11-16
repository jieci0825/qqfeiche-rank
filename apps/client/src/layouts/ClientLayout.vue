<script setup lang="ts">
import { RouterView } from 'vue-router'
import ClientHeader from './components/ClientHeader.vue'
</script>

<template>
    <div class="client-app">
        <ClientHeader />

        <main class="client-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped lang="scss">
.client-app {
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
    }
}
</style>
