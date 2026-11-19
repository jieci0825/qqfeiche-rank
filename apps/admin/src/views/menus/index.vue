<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { apiErrorMessage, listMenus, updateMenu, type AdminMenu } from '@/api'
import { useAuthStore } from '@/stores/auth'
import ManagementDialog from '../access/ManagementDialog.vue'
import { useManagementList } from '../access/use-management-list'
import MenuTreeItem from './MenuTreeItem.vue'

const auth = useAuthStore()
const menus = useManagementList(async signal => (await listMenus(signal)).menus)
const search = ref('')
const editingMenu = shallowRef<AdminMenu>()
const editorOpen = ref(false)
const form = reactive({ title: '', icon: '', sortOrder: '', isVisible: true })
const saving = ref(false)
const saveError = ref('')

const keyword = computed(() => search.value.trim().toLowerCase())
const visibleMenus = computed(() => {
    if (!keyword.value) return menus.items.value

    function filterMenus(items: AdminMenu[]): AdminMenu[] {
        return items.flatMap(menu => {
            if (menu.title.toLowerCase().includes(keyword.value) || menu.path?.toLowerCase().includes(keyword.value)) {
                return [menu]
            }

            const children = filterMenus(menu.children)
            return children.length ? [{ ...menu, children }] : []
        })
    }

    return filterMenus(menus.items.value)
})

function openEditor(menu: AdminMenu) {
    editingMenu.value = menu
    form.title = menu.title
    form.icon = menu.icon ?? ''
    form.sortOrder = String(menu.sortOrder)
    form.isVisible = menu.isVisible
    saveError.value = ''
    editorOpen.value = true
}

async function submit() {
    const menu = editingMenu.value
    if (!menu || saving.value) return
    const title = form.title.trim()
    const icon = form.icon.trim() || null
    const sortOrder = Number(form.sortOrder)
    if (!title) {
        saveError.value = '请输入菜单名称'
        return
    }
    if (!form.sortOrder.trim() || !Number.isSafeInteger(sortOrder)) {
        saveError.value = '排序值必须是有效整数'
        return
    }

    saving.value = true
    saveError.value = ''
    try {
        await updateMenu(menu.id, { title, icon, sortOrder, isVisible: form.isVisible })
        editorOpen.value = false
        ElMessage.success('菜单已更新')
        await auth.reloadAccess().catch(() => ElMessage.warning('菜单已保存，侧栏刷新失败，请重新登录'))
        if (auth.can('menus:read')) await menus.load()
    } catch (error) {
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <el-card class="menu-management" body-class="menu-management__body" shadow="never">
        <div class="menu-management__search" role="search" aria-label="菜单筛选">
            <el-input v-model="search" aria-label="搜索菜单名称或路由" placeholder="搜索菜单名称或路由" clearable />
        </div>

        <p v-if="menus.error.value" class="menu-management__error" role="alert">{{ menus.error.value }}</p>

        <div v-loading="menus.loading.value" class="menu-management__results" :aria-busy="menus.loading.value">
            <div class="menu-management__scroll" role="region" aria-label="菜单列表" tabindex="0">
                <ul v-if="visibleMenus.length" class="menu-management__tree" role="list">
                    <MenuTreeItem v-for="menu in visibleMenus" :key="menu.id" :menu="menu" :keyword="keyword"
                        :can-edit="auth.can('menus:update')" :saving="saving" @edit="openEditor" />
                </ul>
                <p v-else-if="!menus.loading.value && !menus.error.value" class="menu-management__empty" role="status">
                    {{ keyword ? '没有匹配的菜单' : '暂无菜单' }}
                </p>
            </div>
        </div>
    </el-card>

    <ManagementDialog v-model="editorOpen" :title="`编辑菜单 · ${editingMenu?.title ?? ''}`"
        :saving="saving" :error="saveError" @submit="submit">
        <el-form-item label="菜单名称" for="menu-title">
            <el-input id="menu-title" v-model="form.title" maxlength="64" />
        </el-form-item>
        <el-form-item label="图标名称" for="menu-icon">
            <el-input id="menu-icon" v-model="form.icon" maxlength="128" placeholder="例如 ep:menu" clearable />
        </el-form-item>
        <el-form-item label="排序值（越小越靠前）" for="menu-order">
            <el-input id="menu-order" v-model="form.sortOrder" type="number" step="1" />
        </el-form-item>
        <el-form-item label="侧栏显示" for="menu-visibility">
            <el-select id="menu-visibility" v-model="form.isVisible">
                <el-option label="显示" :value="true" />
                <el-option label="隐藏" :value="false" />
            </el-select>
        </el-form-item>
        <p v-if="!editingMenu?.path">隐藏此目录也会隐藏其下的菜单。</p>
    </ManagementDialog>
</template>

<style scoped lang="scss">
.menu-management {
    --el-card-border-radius: var(--tk-radius-base);
    --el-card-padding: 20px;

    height: 100%;
    min-width: 0;

    :deep(.menu-management__body) {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
    }

    .menu-management__search {
        width: min(320px, 100%);
    }

    .menu-management__error {
        margin: 0;
        color: var(--tk-color-error);
        overflow-wrap: anywhere;
    }

    .menu-management__results {
        flex: 1;
        min-height: 0;
        max-width: 600px;

        .menu-management__scroll {
            container-type: inline-size;
            height: 100%;
            overflow: auto;

            &:focus-visible {
                outline: 2px solid var(--tk-color-primary);
                outline-offset: -2px;
            }

            .menu-management__tree {
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .menu-management__empty {
                margin: 0;
                padding-block: 40px;
                color: var(--tk-color-text-secondary);
                text-align: center;
            }
        }
    }

    @media (max-width: 540px) {
        --el-card-padding: 12px;
    }
}
</style>
