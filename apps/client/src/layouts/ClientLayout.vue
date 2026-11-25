<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { clientBackgroundImage } from '@/api/modules/client-assets'
import ClientHeader from './components/ClientHeader.vue'

const route = useRoute()
const main = ref<HTMLElement | null>(null)
const pageBackground = computed(() => clientBackgroundImage('ink-page-background'))

watch(() => route.path, () => main.value?.scrollTo({ top: 0 }), { flush: 'post' })
</script>

<template>
    <div class="client-app">
        <ClientHeader />

        <main ref="main" class="client-main">
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
    background: var(--tk-color-bg) center top / cover no-repeat;
    background-image: v-bind(pageBackground);

    .client-main {
        --client-scrollbar-thumb: var(--tk-color-scrollbar-thumb);

        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--client-scrollbar-thumb) transparent;

        &:hover {
            --client-scrollbar-thumb: var(--tk-color-scrollbar-thumb-hover);
        }

        &::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        &::-webkit-scrollbar-track,
        &::-webkit-scrollbar-corner {
            background: transparent;
        }

        &::-webkit-scrollbar-thumb {
            border-radius: var(--tk-radius-scrollbar);
            background: var(--client-scrollbar-thumb);
        }

        .client-main__inner {
            width: min(1180px, calc(100% - var(--client-layout-gutter) * 2));
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
