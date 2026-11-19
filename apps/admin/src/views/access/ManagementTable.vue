<script setup lang="ts">
defineProps<{ loading: boolean; error: string }>()
defineEmits<{ refresh: [] }>()
</script>

<template>
    <el-card class="management-table" shadow="never">
        <div class="management-table__toolbar">
            <slot name="filters" />
            <el-button :loading="loading" @click="$emit('refresh')">刷新列表</el-button>
            <div v-if="$slots.actions" class="management-table__actions">
                <slot name="actions" />
            </div>
        </div>
        <p v-if="error" class="management-table__error" role="alert">{{ error }}</p>
        <slot />
    </el-card>
</template>

<style scoped lang="scss">
.management-table {
    min-width: 0;

    .management-table__toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        :deep(.el-input) {
            width: min(240px, 100%);
        }

        :deep(.el-select) {
            width: 132px;
        }

        .management-table__actions {
            margin-inline-start: auto;
        }
    }

    .management-table__error {
        margin: 0 0 12px;
        color: var(--tk-color-error);
    }
}
</style>
