<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AdminMenu } from '@/api'
import { Icon } from '@/icons'

const props = defineProps<{ menu: AdminMenu; keyword: string; canEdit: boolean; saving: boolean; nested?: boolean }>()
defineEmits<{ edit: [menu: AdminMenu] }>()

const expanded = ref(true)
watch(() => props.keyword, () => {
    expanded.value = true
})
</script>

<template>
    <li class="menu-tree-item" :class="{ 'menu-tree-item--nested': nested }">
        <div class="menu-tree-item__row" :class="{ 'menu-tree-item__row--expanded': menu.children.length && expanded }">
            <button v-if="menu.children.length" type="button" class="menu-tree-item__toggle"
                :aria-expanded="expanded" :aria-controls="`managed-menu-children-${menu.id}`"
                :aria-label="`${expanded ? '收起' : '展开'}${menu.title}的子菜单`" @click="expanded = !expanded">
                <Icon :icon="expanded ? 'ep:arrow-down' : 'ep:arrow-right'" aria-hidden="true" />
            </button>
            <span v-else class="menu-tree-item__marker" aria-hidden="true"></span>

            <div class="menu-tree-item__content">
                <div class="menu-tree-item__name">
                    <Icon v-if="menu.icon" :icon="menu.icon" aria-hidden="true" />
                    <span>{{ menu.title }}</span>
                </div>
                <div class="menu-tree-item__details">
                    <code v-if="menu.path">{{ menu.path }}</code>
                    <span v-else>目录</span>
                    <span v-if="menu.permissionCode">权限 <code>{{ menu.permissionCode }}</code></span>
                    <span>排序 {{ menu.sortOrder }}</span>
                </div>
            </div>

            <div class="menu-tree-item__actions">
                <el-tag size="small" :type="menu.isVisible ? 'success' : 'info'">
                    {{ menu.isVisible ? '显示' : '隐藏' }}
                </el-tag>
                <el-button v-if="canEdit" link type="primary" :disabled="saving" :aria-label="`编辑${menu.title}`"
                    @click="$emit('edit', menu)">编辑</el-button>
            </div>
        </div>

        <ul v-if="menu.children.length" v-show="expanded" :id="`managed-menu-children-${menu.id}`"
            class="menu-tree-item__children" role="list">
            <MenuTreeItem v-for="child in menu.children" :key="child.id" :menu="child" :keyword="keyword"
                :can-edit="canEdit" :saving="saving" nested @edit="$emit('edit', $event)" />
        </ul>
    </li>
</template>

<style scoped lang="scss">
.menu-tree-item {
    --menu-tree-branch-width: 12px;
    --menu-tree-marker-size: 28px;
    --menu-tree-marker-center: calc(var(--menu-tree-marker-size) / 2);
    --menu-tree-line-color: var(--tk-color-border-strong);

    position: relative;

    &.menu-tree-item--nested {
        // 引线穿过前面的分支，在最后一个节点处转向。
        &:not(:last-child)::before {
            position: absolute;
            inset-block: 0;
            inset-inline-start: calc(-1 * var(--menu-tree-branch-width));
            border-inline-start: 1px solid var(--menu-tree-line-color);
            content: '';
        }

        > .menu-tree-item__row::before {
            position: absolute;
            inset-block: 0 50%;
            inset-inline-start: calc(-1 * var(--menu-tree-branch-width));
            width: calc(var(--menu-tree-branch-width) + var(--menu-tree-marker-center) - 5px);
            border-inline-start: 1px solid var(--menu-tree-line-color);
            border-block-end: 1px solid var(--menu-tree-line-color);
            content: '';
        }
    }

    > .menu-tree-item__row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 56px;
        padding: 8px;
        padding-inline-start: 0;
        border-radius: var(--tk-radius-base);

        &:hover {
            background: var(--tk-color-bg-hover);
        }

        &.menu-tree-item__row--expanded::after {
            position: absolute;
            inset-block: calc(50% + var(--menu-tree-marker-center)) 0;
            inset-inline-start: var(--menu-tree-marker-center);
            border-inline-start: 1px solid var(--menu-tree-line-color);
            content: '';
        }

        .menu-tree-item__toggle,
        .menu-tree-item__marker {
            display: grid;
            flex: none;
            place-items: center;
            width: var(--menu-tree-marker-size);
            height: var(--menu-tree-marker-size);
            color: var(--tk-color-text-secondary);
        }

        .menu-tree-item__toggle {
            padding: 0;
            border: 0;
            border-radius: var(--tk-radius-small);
            background: transparent;
            cursor: pointer;

            &:hover {
                background: var(--tk-color-bg-active);
            }

            &:focus-visible {
                outline: 2px solid var(--tk-color-primary);
                outline-offset: -2px;
            }
        }

        .menu-tree-item__marker::before {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--menu-tree-line-color);
            content: '';
        }

        .menu-tree-item__content {
            display: grid;
            flex: 1;
            gap: 4px;
            min-width: 0;
            overflow-wrap: anywhere;

            .menu-tree-item__name {
                display: flex;
                align-items: baseline;
                gap: 8px;
                color: var(--tk-color-text-primary);
                font-weight: 600;

                svg {
                    flex: none;
                    align-self: center;
                }
            }

            .menu-tree-item__details {
                display: flex;
                flex-wrap: wrap;
                gap: 2px 12px;
                color: var(--tk-color-text-secondary);
                font-size: 12px;
                font-variant-numeric: tabular-nums;
            }
        }

        .menu-tree-item__actions {
            display: flex;
            flex: none;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px 12px;
        }
    }

    > .menu-tree-item__children {
        margin: 0;
        padding: 0;
        padding-inline-start: calc(var(--menu-tree-marker-center) + var(--menu-tree-branch-width));
        list-style: none;
    }

    @container (max-width: 360px) {
        --menu-tree-branch-width: 8px;
        --menu-tree-marker-size: 24px;

        > .menu-tree-item__row {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 4px 8px;

            .menu-tree-item__toggle,
            .menu-tree-item__marker {
                grid-row: span 2;
            }

            .menu-tree-item__actions {
                grid-column: 2;
            }
        }
    }
}
</style>
