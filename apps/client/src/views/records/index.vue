<script setup lang="ts">
import { ref } from 'vue'
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
</script>

<template>
    <section class="records-page">
        <div class="records-page__main">
            <RecordsSearch v-model="keyword" />

            <RecordsGrid />
        </div>

        <RecordsFilter v-model="filter" />
    </section>
</template>

<style scoped lang="scss">
.records-page {
    display: flex;
    flex: 1;
    gap: 20px;

    .records-page__main {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 20px;
        min-width: 0;
    }
}
</style>
