<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { ElCheckbox, ElCheckboxGroup, ElMessage, ElMessageBox } from 'element-plus'
import {
    apiErrorMessage, assignRolePermissions, createRole, deleteRole, listPermissions, listRoles,
    updateRole, type Permission, type Role,
} from '@/api'
import { useAuthStore } from '@/stores/auth'
import ManagementDialog from '../access/ManagementDialog.vue'
import ManagementTable from '../access/ManagementTable.vue'
import { useManagementList } from '../access/use-management-list'

const auth = useAuthStore()
const roles = useManagementList(async signal => (await listRoles(signal)).roles)
const permissions = useManagementList(async signal => (await listPermissions(signal)).permissions, false)
const search = ref('')
const editorOpen = ref(false)
const editingRole = shallowRef<Role>()
const form = reactive({ code: '', name: '', description: '' })
const permissionDialogOpen = ref(false)
const permissionRole = shallowRef<Role>()
const selectedPermissions = ref<string[]>([])
const saving = ref(false)
const saveError = ref('')
const deletingId = ref<number>()

const visibleRoles = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    return roles.items.value.filter(role =>
        role.name.toLowerCase().includes(keyword) || role.code.toLowerCase().includes(keyword),
    )
})
const permissionGroups = computed(() => {
    const byMenu = new Map<number, Permission[]>()
    for (const permission of permissions.items.value) {
        const group = byMenu.get(permission.menuId)
        if (group) group.push(permission)
        else byMenu.set(permission.menuId, [permission])
    }
    return [...byMenu].map(([menuId, group]) => ({
        menuId,
        title: group.find(permission => permission.kind === 'page')?.label.replace(/^查看/, '') ??
            group[0].code.split(':')[0],
        items: [...group].sort((a, b) => Number(b.kind === 'page') - Number(a.kind === 'page')),
    }))
})
const canAssignPermissions = computed(() =>
    permissionRole.value !== undefined && canManage(permissionRole.value, 'roles:assign-permissions'),
)

function canManage(role: Role, permission: string) {
    return !role.isSystem && auth.can(permission) && role.permissions.every(code => auth.can(code))
}

function openEditor(role?: Role) {
    editingRole.value = role
    form.code = role?.code ?? ''
    form.name = role?.name ?? ''
    form.description = role?.description ?? ''
    saveError.value = ''
    editorOpen.value = true
}

function openPermissions(role: Role) {
    permissionRole.value = role
    selectedPermissions.value = [...role.permissions]
    saveError.value = ''
    permissionDialogOpen.value = true
    void permissions.load()
}

async function submitRole() {
    if (saving.value) return
    const role = editingRole.value
    const code = form.code.trim()
    const name = form.name.trim()
    const description = form.description.trim() || null
    if (!role && !/^[a-z][a-z0-9_-]*$/.test(code)) {
        saveError.value = '角色编码须以小写字母开头，只能包含小写字母、数字、下划线和连字符'
        return
    }
    if (!name) {
        saveError.value = '请输入角色名称'
        return
    }

    saving.value = true
    saveError.value = ''
    try {
        if (role) await updateRole(role.id, { name, description })
        else await createRole({ code, name, description })
        editorOpen.value = false
        ElMessage.success(role ? '角色已更新' : '角色已新增')
        await roles.load()
    } catch (error) {
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
    }
}

async function submitPermissions() {
    const role = permissionRole.value
    if (!role || saving.value || !canAssignPermissions.value || permissions.loading.value || permissions.error.value) return

    saving.value = true
    saveError.value = ''
    try {
        await assignRolePermissions(role.id, [...selectedPermissions.value])
        permissionDialogOpen.value = false
        ElMessage.success('角色权限已更新')
        if (auth.roles.some(current => current.id === role.id)) {
            await auth.reloadAccess().catch(() => ElMessage.warning('权限已保存，当前权限刷新失败，请重新登录'))
        }
        if (auth.can('roles:read')) await roles.load()
    } catch (error) {
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
    }
}

async function confirmDelete(role: Role) {
    if (deletingId.value !== undefined) return
    deletingId.value = role.id
    try {
        await ElMessageBox.confirm(`确定删除角色「${role.name}」？`, '删除角色', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        await deleteRole(role.id)
        ElMessage.success('角色已删除')
        await roles.load()
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') ElMessage.error(apiErrorMessage(error))
    } finally {
        deletingId.value = undefined
    }
}
</script>

<template>
    <ManagementTable :loading="roles.loading.value" :error="roles.error.value" @refresh="roles.load">
        <template #filters>
            <el-input v-model="search" aria-label="搜索角色名称或编码" placeholder="搜索角色名称或编码" clearable />
        </template>
        <template v-if="auth.can('roles:create')" #actions>
            <el-button type="primary" :disabled="saving" @click="openEditor()">新增角色</el-button>
        </template>

        <el-table v-loading="roles.loading.value" :data="visibleRoles" row-key="id"
            :empty-text="roles.error.value ? '列表加载失败' : search ? '没有匹配的角色' : '暂无角色'">
            <el-table-column label="角色名称" min-width="145" show-overflow-tooltip>
                <template #default="{ row }">
                    {{ row.name }}
                    <el-tag v-if="row.isSystem" type="info" size="small">内置</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="角色编码" prop="code" min-width="128" show-overflow-tooltip />
            <el-table-column label="描述" min-width="180" show-overflow-tooltip>
                <template #default="{ row }">{{ row.description || '—' }}</template>
            </el-table-column>
            <el-table-column label="权限数" width="86">
                <template #default="{ row }">{{ row.permissions.length }}</template>
            </el-table-column>
            <!-- @vue-generic {Role} -->
            <el-table-column label="操作" width="176">
                <template #default="{ row }">
                    <el-button v-if="canManage(row, 'roles:update')" link type="primary" :disabled="saving"
                        @click="openEditor(row)">编辑</el-button>
                    <el-button link type="primary" :disabled="saving" @click="openPermissions(row)">
                        {{ canManage(row, 'roles:assign-permissions') ? '分配权限' : '查看权限' }}
                    </el-button>
                    <el-button v-if="canManage(row, 'roles:delete')" link type="danger"
                        :loading="deletingId === row.id" :disabled="deletingId !== undefined"
                        @click="confirmDelete(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
    </ManagementTable>

    <ManagementDialog v-model="editorOpen" :title="editingRole ? '编辑角色' : '新增角色'"
        :saving="saving" :error="saveError" @submit="submitRole">
        <el-form-item label="角色编码" for="role-code">
            <el-input id="role-code" v-model="form.code" maxlength="64" :readonly="!!editingRole" />
        </el-form-item>
        <el-form-item label="角色名称" for="role-name">
            <el-input id="role-name" v-model="form.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="描述" for="role-description">
            <el-input id="role-description" v-model="form.description" type="textarea" :rows="3" maxlength="500" />
        </el-form-item>
    </ManagementDialog>

    <ManagementDialog v-model="permissionDialogOpen" wide
        :title="`${canAssignPermissions ? '分配权限' : '查看权限'} · ${permissionRole?.name ?? ''}`"
        :readonly="!canAssignPermissions" :saving="saving" :error="saveError"
        :submit-disabled="permissions.loading.value || !!permissions.error.value" @submit="submitPermissions">
        <div v-if="permissions.error.value">
            <p role="alert">{{ permissions.error.value }}</p>
            <el-button link type="primary" @click="permissions.load">重新加载权限</el-button>
        </div>
        <div v-else v-loading="permissions.loading.value" class="role-permissions">
            <el-checkbox-group v-model="selectedPermissions" aria-label="角色权限" :disabled="!canAssignPermissions">
                <fieldset v-for="group in permissionGroups" :key="group.menuId" class="role-permissions__group">
                    <legend>{{ group.title }}</legend>
                    <div class="role-permissions__options">
                        <el-checkbox v-for="permission in group.items" :key="permission.code"
                            :value="permission.code" :disabled="!auth.can(permission.code)">
                            {{ permission.label }}
                        </el-checkbox>
                    </div>
                </fieldset>
            </el-checkbox-group>
            <p v-if="!permissions.loading.value && !permissionGroups.length">暂无权限</p>
        </div>
    </ManagementDialog>
</template>

<style scoped lang="scss">
.role-permissions {
    display: grid;
    min-height: 80px;
    max-height: 55dvh;
    padding-inline-end: 4px;
    overflow-y: auto;

    :deep(.el-checkbox-group) {
        display: grid;
        gap: 12px;
    }

    .role-permissions__group {
        min-width: 0;
        margin: 0;
        padding: 0 12px 8px;
        border: 1px solid var(--tk-color-border);
        border-radius: var(--tk-radius-base);

        legend {
            padding-inline: 4px;
            font-weight: 600;
            color: var(--tk-color-text-primary);
        }

        .role-permissions__options {
            display: flex;
            flex-wrap: wrap;
            gap: 0 16px;

            :deep(.el-checkbox) {
                max-width: 100%;
                margin: 0;
            }
        }
    }
}
</style>
