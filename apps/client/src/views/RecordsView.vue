<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@/icons'

const keyword = ref('')
</script>

<template>
    <section class="records-page">
        <div class="records-page__main">
            <div class="records-search">
                <el-input v-model="keyword" placeholder="搜索赛道、车手、车队" clearable>
                    <template #prefix>
                        <Icon icon="ep:search" aria-hidden="true" />
                    </template>
                </el-input>
            </div>

            <div class="records-grid"></div>
        </div>

        <aside class="records-filter" aria-label="筛选栏"></aside>
    </section>
</template>

<style scoped lang="scss">
// 记录榜：左侧为搜索栏与自适应宫格，右侧为固定宽度的筛选栏。
.records-page {
    display: flex;
    flex: 1;
    gap: 20px;
}

.records-page__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
}

.records-grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    align-content: start;
}

.records-filter {
    flex: 0 0 320px;
    width: 320px;
    border: 1px solid var(--tk-color-border);
}
</style>
