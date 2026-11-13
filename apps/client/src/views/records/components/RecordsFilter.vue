<script lang="ts">
export interface RecordsFilterValue {
    stars: number[]
    scenes: string[]
    distances: string[]
}
</script>

<script setup lang="ts">
type FilterKey = keyof RecordsFilterValue

interface FilterOption {
    value: number | string
    label: string
}

interface FilterGroup {
    key: FilterKey
    title: string
    options: FilterOption[]
}

const filterGroups: FilterGroup[] = [
    {
        key: 'stars',
        title: '星级',
        options: Array.from({ length: 7 }, (_, index) => ({
            value: index + 1,
            label: `${index + 1} 星`,
        })),
    },
    {
        key: 'scenes',
        title: '场景',
        options: [
            { value: 'ranked', label: '排位' },
            { value: 'peak', label: '巅峰' },
            { value: 'league', label: '联赛' },
            { value: 'other', label: '其他' },
        ],
    },
    {
        key: 'distances',
        title: '距离',
        options: [
            { value: 'short', label: '短' },
            { value: 'medium', label: '中' },
            { value: 'long', label: '长' },
        ],
    },
]

const model = defineModel<RecordsFilterValue>({ required: true })

function isActive(key: FilterKey, value: number | string) {
    return (model.value[key] as Array<number | string>).includes(value)
}

function toggle(key: FilterKey, value: number | string) {
    const current = model.value[key] as Array<number | string>
    model.value = {
        ...model.value,
        [key]: current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value],
    }
}

function reset() {
    model.value = { stars: [], scenes: [], distances: [] }
}
</script>

<template>
    <aside
        class="records-filter"
        aria-label="筛选栏"
    >
        <div class="records-filter__header">
            <h2 class="records-filter__title">筛选赛道</h2>

            <button
                class="records-filter__clear"
                type="button"
                @click="reset"
            >
                清空
            </button>
        </div>

        <section
            v-for="group in filterGroups"
            :key="group.key"
            class="records-filter__group"
        >
            <div class="records-filter__group-header">
                <h3 class="records-filter__group-title">{{ group.title }}</h3>
                <span class="records-filter__group-mode">多选</span>
            </div>

            <div
                class="records-filter__options"
                role="group"
                :aria-label="group.title"
            >
                <button
                    v-for="option in group.options"
                    :key="option.value"
                    class="records-filter__option"
                    :class="{ 'is-active': isActive(group.key, option.value) }"
                    :aria-pressed="isActive(group.key, option.value)"
                    type="button"
                    @click="toggle(group.key, option.value)"
                >
                    {{ option.label }}
                </button>
            </div>
        </section>
    </aside>
</template>

<style scoped lang="scss">
$gap: 15px;

.records-filter {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-self: flex-start;
    flex-shrink: 0;
    width: 290px;
    padding: $gap;
    border: 1px solid var(--tk-color-border);
    border-radius: var(--radius-base);

    .records-filter__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $gap;
        padding-bottom: $gap;
        border-bottom: 1px solid var(--tk-color-border);

        .records-filter__title {
            margin: 0;
            color: var(--tk-color-text-primary);
            font-size: 16px;
            font-weight: 600;
        }

        .records-filter__clear {
            padding: 0;
            border: none;
            background: none;
            color: var(--tk-color-text-tertiary);
            font-size: 13px;
            text-decoration: underline;
            text-underline-offset: 4px;
            cursor: pointer;
            transition: color 0.2s ease;

            &:hover {
                color: var(--tk-color-primary);
            }
        }
    }

    .records-filter__group {
        display: flex;
        flex-direction: column;
        gap: $gap;
        padding: $gap 0;
        border-bottom: 1px solid var(--tk-color-border);

        &:last-child {
            padding-bottom: 0;
            border-bottom: none;
        }

        .records-filter__group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: $gap;

            .records-filter__group-title {
                margin: 0;
                color: var(--tk-color-text-primary);
                font-size: 15px;
                font-weight: 500;
            }

            .records-filter__group-mode {
                color: var(--tk-color-text-tertiary);
                font-size: 12px;
            }
        }

        .records-filter__options {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            .records-filter__option {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                height: 25px;
                padding: 0 10px;
                border: 1px solid var(--tk-color-border);
                border-radius: var(--radius-small);
                background: transparent;
                color: var(--tk-color-text-secondary);
                font-size: 12px;
                line-height: 1;
                cursor: pointer;
                transition:
                    border-color 0.2s ease,
                    background-color 0.2s ease,
                    color 0.2s ease;

                &:hover {
                    border-color: var(--tk-color-primary-border);
                    color: var(--tk-color-primary);
                }

                &.is-active {
                    border-color: var(--tk-color-primary);
                    background: var(--tk-color-primary-subtle);
                    color: var(--tk-color-primary);
                    font-weight: 500;
                }
            }
        }
    }
}
</style>
