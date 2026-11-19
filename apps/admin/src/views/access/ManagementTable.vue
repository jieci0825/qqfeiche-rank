<script setup lang="ts">
defineProps<{ loading: boolean; error: string; compact?: boolean }>()
defineEmits<{ refresh: [] }>()
</script>

<template>
    <el-card class="management-table" :class="{ 'management-table--compact': compact }"
        body-class="management-table__body" shadow="never">
        <div class="management-table__controls">
            <div class="management-table__search" role="search" aria-label="列表筛选">
                <slot name="search" />
            </div>
            <div class="management-table__toolbar">
                <el-button :loading="loading" @click="$emit('refresh')">刷新列表</el-button>
                <div v-if="$slots.actions" class="management-table__actions">
                    <slot name="actions" />
                </div>
            </div>
        </div>

        <div class="management-table__results">
            <div v-if="error" class="management-table__error">
                <slot name="error">
                    <p role="alert">{{ error }}</p>
                </slot>
            </div>
            <div class="management-table__viewport">
                <slot />
            </div>
        </div>
    </el-card>
</template>

<style scoped lang="scss">
.management-table {
    --el-card-border-radius: var(--tk-radius-base);
    --el-card-padding: 20px;

    height: 100%;
    min-width: 0;

    :deep(.management-table__body) {
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-height: 0;
        overflow: hidden;
    }

    .management-table__controls {
        display: contents;

        .management-table__search,
        .management-table__toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 12px;
            min-height: 0;
            min-width: 0;
            overflow: auto;

            :deep(.el-input) {
                width: min(240px, 100%);
            }

            :deep(.el-select) {
                width: min(132px, 100%);
            }
        }

        .management-table__toolbar {
            .management-table__actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px 12px;
                margin-inline-start: auto;
            }
        }
    }

    .management-table__results {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;

        .management-table__error {
            flex: none;
            margin: 0 0 12px;
            color: var(--tk-color-error);
            overflow-wrap: anywhere;

            p {
                margin: 0;
            }
        }

        .management-table__viewport {
            flex: 1;
            min-height: 0;
        }
    }

    &.management-table--compact {
        height: auto;

        :deep(.management-table__body) {
            gap: 16px;
        }

        .management-table__controls {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 12px;

            .management-table__search,
            .management-table__toolbar {
                overflow: visible;
            }

            .management-table__search {
                flex: 0 1 240px;
            }

            .management-table__toolbar {
                flex: 1 1 max-content;
            }
        }
    }
}
</style>
