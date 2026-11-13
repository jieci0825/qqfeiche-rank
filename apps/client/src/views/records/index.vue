<script setup lang="ts">
import { ref, watch } from 'vue'
import RecordsFilter, {
    type RecordsFilterValue,
} from './components/RecordsFilter.vue'
import RecordsGrid from './components/RecordsGrid.vue'
import RecordsSearch from './components/RecordsSearch.vue'

const keyword = ref('')
const filter = ref<RecordsFilterValue>({
    stars: [],
    scenes: [],
    distances: [],
})
const gridViewportRef = ref<HTMLElement | null>(null)

// 搜索或筛选条件变化后，回到记录宫格顶部。
watch(
    [keyword, filter],
    () => {
        gridViewportRef.value?.scrollTo({ top: 0 })
    },
    { deep: true },
)
</script>

<template>
    <section class="records-page">
        <div class="records-page__main">
            <div class="records-page__search-panel">
                <RecordsSearch v-model="keyword" />
            </div>

            <div class="records-page__grid-panel">
                <div
                    ref="gridViewportRef"
                    class="records-page__grid-viewport"
                >
                    <RecordsGrid
                        :keyword="keyword"
                        :filter="filter"
                    />
                </div>
            </div>
        </div>

        <RecordsFilter v-model="filter" />
    </section>
</template>

<style scoped lang="scss">
$panel-padding: 15px;

.records-page {
    display: flex;
    flex: 1;
    gap: 20px;
    min-height: 0;

    .records-page__main {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 20px;
        min-width: 0;
        min-height: 0;
    }

    // 搜索区与宫格区各自成面板，边界样式与右侧筛选栏保持一致。
    .records-page__search-panel,
    .records-page__grid-panel {
        border: 1px solid var(--tk-color-border);
        border-radius: var(--radius-base);
    }

    .records-page__search-panel {
        flex: 0 0 auto;
        padding: $panel-padding;
    }

    .records-page__grid-panel {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        padding: $panel-padding 0;
        overflow: hidden;
    }

    // 面板负责固定上下留白，滚动视口铺满面板宽度：
    // 滚动条挂在视口右侧、紧贴面板边框，卡片与滚动条之间保留横向内边距。
    .records-page__grid-viewport {
        flex: 1;
        min-height: 0;
        padding: 0 $panel-padding;
        overflow-y: auto;
        scrollbar-color: var(--tk-color-border) transparent;
        scrollbar-width: thin;

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }

        &::-webkit-scrollbar-thumb {
            border-radius: 999px;
            background: var(--tk-color-border);
        }
    }
}
</style>
