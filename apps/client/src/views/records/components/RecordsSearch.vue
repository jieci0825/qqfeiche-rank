<script setup lang="ts">
import { Icon } from '@/icons'

const keyword = defineModel<string>({ default: '' })
</script>

<template>
    <div class="records-search">
        <el-input
            v-model="keyword"
            placeholder="搜索赛道、车手、车队"
            clearable
            size="large"
        >
            <template #prefix>
                <Icon
                    icon="ep:search"
                    aria-hidden="true"
                />
            </template>
        </el-input>
    </div>
</template>

<style scoped lang="scss">
.records-search {
    width: 300px;
}
</style>
