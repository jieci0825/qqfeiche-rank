<script setup lang="ts">
import { reactive, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { apiErrorMessage, listMenus, updateMenu, type AdminMenu } from '@/api'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import ManagementDialog from '../access/ManagementDialog.vue'
import ManagementTable from '../access/ManagementTable.vue'
import { useManagementList } from '../access/use-management-list'

const auth = useAuthStore()
const menus = useManagementList(async signal => (await listMenus(signal)).menus)
const editingMenu = shallowRef<AdminMenu>()
const editorOpen = ref(false)
const form = reactive({ title: '', icon: '', sortOrder: '', isVisible: true })
const saving = ref(false)
const saveError = ref('')

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
    <ManagementTable :loading="menus.loading.value" :error="menus.error.value" @refresh="menus.load">
        <el-table v-loading="menus.loading.value" :data="menus.items.value" row-key="id" default-expand-all
            :empty-text="menus.error.value ? '列表加载失败' : '暂无菜单'">
            <el-table-column label="菜单名称" min-width="164" show-overflow-tooltip>
                <template #default="{ row }">
                    <Icon v-if="row.icon" :icon="row.icon" aria-hidden="true" />
                    {{ row.title }}
                </template>
            </el-table-column>
            <el-table-column label="路由" min-width="126" show-overflow-tooltip>
                <template #default="{ row }">{{ row.path ?? '目录' }}</template>
            </el-table-column>
            <el-table-column label="访问权限" min-width="152" show-overflow-tooltip>
                <template #default="{ row }">{{ row.permissionCode ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="排序值" prop="sortOrder" width="86" />
            <el-table-column label="可见设置" width="100">
                <template #default="{ row }">
                    <el-tag :type="row.isVisible ? 'success' : 'info'">
                        {{ row.isVisible ? '显示' : '隐藏' }}
                    </el-tag>
                </template>
            </el-table-column>
            <!-- @vue-generic {AdminMenu} -->
            <el-table-column v-if="auth.can('menus:update')" label="操作" width="86">
                <template #default="{ row }">
                    <el-button link type="primary" :disabled="saving" @click="openEditor(row)">编辑</el-button>
                </template>
            </el-table-column>
        </el-table>
    </ManagementTable>

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
