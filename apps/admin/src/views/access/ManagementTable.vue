<script setup lang="ts">
defineProps<{ error: string; compact?: boolean }>()
</script>

<template>
    <el-card class="management-table" :class="{ 'management-table--compact': compact }"
        body-class="management-table__body" shadow="never">
        <div v-if="$slots.search" class="management-table__search" role="search" aria-label="列表筛选">
            <slot name="search" />
        </div>
        <div v-if="$slots.actions" class="management-table__toolbar">
            <slot name="actions" />
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

    .management-table__search,
    .management-table__toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
        min-height: 0;
        min-width: 0;
        overflow: auto;
    }

    .management-table__search {
        :deep(.el-input) {
            width: min(240px, 100%);
        }

        :deep(.el-select) {
            width: min(132px, 100%);
        }
    }

    .management-table__toolbar {
        justify-content: flex-start;

        :deep(.el-button + .el-button) {
            margin-left: 0;
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

            :deep(.management-table__row-actions) {
                display: flex;
                flex-wrap: nowrap;
                align-items: center;
                gap: 12px;

                > .el-button {
                    flex: none;
                    margin-inline-start: 0;
                }
            }
        }
    }

    &.management-table--compact {
        height: auto;

        :deep(.management-table__body) {
            gap: 16px;
        }

        .management-table__search,
        .management-table__toolbar {
            overflow: visible;
        }
    }
}
</style>
