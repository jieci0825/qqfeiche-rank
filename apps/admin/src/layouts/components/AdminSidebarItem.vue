<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { AdminMenu } from '@/api/auth'
import { Icon } from '@/icons'

const props = defineProps<{ menu: AdminMenu }>()
const route = useRoute()
const expanded = ref(false)
const childrenId = computed(() => `admin-sidebar-children-${props.menu.id}`)
const active = computed(() => route.meta.menuTrail?.at(-1)?.id === props.menu.id)

watch(() => route.meta.menuTrail, trail => {
    if (trail?.some(menu => menu.id === props.menu.id)) expanded.value = true
}, { immediate: true })
</script>

<template>
    <div class="admin-sidebar__entry">
        <div class="admin-sidebar__row">
            <RouterLink
                v-if="menu.path"
                class="admin-sidebar__item"
                :class="{ 'is-active': active }"
                :to="menu.path"
            >
                <Icon v-if="menu.icon" :icon="menu.icon" aria-hidden="true" />
                {{ menu.title }}
            </RouterLink>
            <button
                v-if="menu.children.length"
                type="button"
                class="admin-sidebar__item"
                :class="{ 'admin-sidebar__expand': menu.path }"
                :aria-label="menu.path ? `${expanded ? '收起' : '展开'}${menu.title}子菜单` : undefined"
                :aria-expanded="expanded"
                :aria-controls="childrenId"
                @click="expanded = !expanded"
            >
                <template v-if="!menu.path">
                    <Icon v-if="menu.icon" :icon="menu.icon" aria-hidden="true" />
                    {{ menu.title }}
                </template>
                <Icon
                    class="admin-sidebar__chevron"
                    :class="{ 'is-expanded': expanded }"
                    icon="ep:arrow-right"
                    aria-hidden="true"
                />
            </button>
        </div>
        <div v-if="menu.children.length" v-show="expanded" :id="childrenId" class="admin-sidebar__children">
            <AdminSidebarItem v-for="child in menu.children" :key="child.id" :menu="child" />
        </div>
    </div>
</template>
