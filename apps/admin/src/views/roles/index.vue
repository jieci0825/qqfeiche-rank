<script setup lang="ts">
import { computed, reactive, ref, shallowRef, useTemplateRef } from 'vue'
import { ElCheckbox, ElCheckboxGroup, ElMessage, ElMessageBox, type InputInstance } from 'element-plus'
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
const searchInput = useTemplateRef<InputInstance>('searchInput')
const editorOpen = ref(false)
const editingRole = shallowRef<Role>()
const form = reactive({ code: '', name: '', description: '' })
const permissionDialogOpen = ref(false)
const permissionRole = shallowRef<Role>()
const selectedPermissions = ref<string[]>([])
const saving = ref(false)
const saveError = ref('')
const deletingId = ref<number>()

const searchKeyword = computed(() => search.value.trim().toLowerCase())
const visibleRoles = computed(() => {
    const keyword = searchKeyword.value
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
const affectsCurrentAccount = computed(() => auth.roles.some(role => role.id === permissionRole.value?.id))
const permissionChanges = computed(() => {
    const before = new Set(permissionRole.value?.permissions)
    const after = new Set(selectedPermissions.value)
    const labels = new Map(permissions.items.value.map(permission => [permission.code, permission.label]))
    const withLabel = (code: string) => ({ code, label: labels.get(code) ?? code })

    return {
        added: [...after].filter(code => !before.has(code)).map(withLabel),
        removed: [...before].filter(code => !after.has(code)).map(withLabel),
    }
})

function canManage(role: Role, permission: string) {
    return !role.isSystem && auth.can(permission) && role.permissions.every(code => auth.can(code))
}

function clearSearch() {
    search.value = ''
    searchInput.value?.focus()
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
        if (affectsCurrentAccount.value) {
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
            customClass: 'roles-page',
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
    <ManagementTable class="roles-page" compact :error="roles.error.value">
        <template #search>
            <el-input ref="searchInput" v-model="search" aria-label="搜索角色名称或编码"
                placeholder="搜索角色名称或编码" clearable />
        </template>
        <template v-if="auth.can('roles:create')" #actions>
            <el-button type="primary" :disabled="saving" @click="openEditor()">新增角色</el-button>
        </template>
        <template #error>
            <div class="roles-page__list-error">
                <p role="alert">
                    {{ roles.hasLoaded.value ? '刷新失败，正在显示上次加载的结果。' : '角色列表加载失败。' }}
                    {{ roles.error.value }}
                </p>
                <el-button link type="primary" @click="roles.load">重试</el-button>
            </div>
        </template>

        <el-table v-if="!roles.error.value || roles.hasLoaded.value" v-loading="roles.loading.value"
            :aria-busy="roles.loading.value" :data="visibleRoles" row-key="id"
            max-height="min(36rem, 65dvh)" :scrollbar-tabindex="0">
            <template #empty>
                <div v-if="!roles.loading.value" class="roles-page__empty">
                    <span>{{ searchKeyword ? '没有匹配的角色' : '暂无角色' }}</span>
                    <el-button v-if="searchKeyword" link type="primary" @click="clearSearch">清除搜索</el-button>
                </div>
            </template>
            <el-table-column label="角色名称" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">
                    <span class="roles-page__name">{{ row.name }}</span>
                    <el-tag v-if="row.isSystem" class="roles-page__system-role" type="info" size="small"
                        title="内置角色只能查看权限">内置</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="角色编码" prop="code" width="160" class-name="roles-page__code"
                show-overflow-tooltip />
            <el-table-column label="描述" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ row.description || '—' }}</template>
            </el-table-column>
            <el-table-column label="权限数" width="86" align="right" class-name="roles-page__count">
                <template #default="{ row }">{{ row.permissions.length }}</template>
            </el-table-column>
            <!-- @vue-generic {Role} -->
            <el-table-column label="操作" width="176">
                <template #default="{ row }">
                    <el-button v-if="canManage(row, 'roles:update')" link type="primary" :disabled="saving"
                        @click="openEditor(row)">编辑</el-button>
                    <el-button class="roles-page__permission-action" link type="primary" :disabled="saving"
                        @click="openPermissions(row)">
                        {{ canManage(row, 'roles:assign-permissions') ? '分配权限' : '查看权限' }}
                    </el-button>
                    <el-button v-if="canManage(row, 'roles:delete')" link type="danger"
                        :loading="deletingId === row.id" :disabled="deletingId !== undefined"
                        @click="confirmDelete(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
    </ManagementTable>

    <ManagementDialog v-model="editorOpen" class="roles-page" :title="editingRole ? '编辑角色' : '新增角色'"
        :saving="saving" :error="saveError" @submit="submitRole">
        <el-form-item label="角色编码" for="role-code">
            <el-input id="role-code" v-model="form.code" maxlength="64" :readonly="!!editingRole"
                aria-describedby="role-code-help" />
            <span id="role-code-help" class="roles-page__field-help">
                {{ editingRole ? '角色编码创建后不可修改。' : '以小写字母开头，只能用小写字母、数字、下划线和连字符，如 event-admin。' }}
            </span>
        </el-form-item>
        <el-form-item label="角色名称" for="role-name">
            <el-input id="role-name" v-model="form.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="描述" for="role-description">
            <el-input id="role-description" v-model="form.description" type="textarea" :rows="3" maxlength="500" />
        </el-form-item>
    </ManagementDialog>

    <ManagementDialog v-model="permissionDialogOpen" class="roles-page" wide
        :title="`${canAssignPermissions ? '分配权限' : '查看权限'} · ${permissionRole?.name ?? ''}`"
        :readonly="!canAssignPermissions" :saving="saving" :error="saveError"
        :submit-disabled="permissions.loading.value || !!permissions.error.value" @submit="submitPermissions">
        <div v-if="permissions.error.value">
            <p role="alert">{{ permissions.error.value }}</p>
            <el-button link type="primary" @click="permissions.load">重新加载权限</el-button>
        </div>
        <div v-else v-loading="permissions.loading.value" class="roles-page__permissions">
            <el-checkbox-group v-model="selectedPermissions" aria-label="角色权限" :disabled="!canAssignPermissions">
                <fieldset v-for="group in permissionGroups" :key="group.menuId" class="roles-page__permission-group">
                    <legend>{{ group.title }}</legend>
                    <div class="roles-page__permission-options">
                        <el-checkbox v-for="permission in group.items" :key="permission.code"
                            :value="permission.code" :disabled="!auth.can(permission.code)">
                            {{ permission.label }}
                        </el-checkbox>
                    </div>
                </fieldset>
            </el-checkbox-group>
            <p v-if="!permissions.loading.value && !permissionGroups.length">暂无权限</p>
        </div>
        <template v-if="canAssignPermissions && !permissions.loading.value && !permissions.error.value &&
            (permissionChanges.added.length || permissionChanges.removed.length)">
            <details class="roles-page__permission-changes">
                <summary>新增 {{ permissionChanges.added.length }} 项 · 移除 {{ permissionChanges.removed.length }} 项</summary>
                <div class="roles-page__permission-change-list">
                    <div v-if="permissionChanges.added.length">
                        <p>新增权限</p>
                        <ul>
                            <li v-for="permission in permissionChanges.added" :key="permission.code">{{ permission.label }}</li>
                        </ul>
                    </div>
                    <div v-if="permissionChanges.removed.length">
                        <p>移除权限</p>
                        <ul>
                            <li v-for="permission in permissionChanges.removed" :key="permission.code">{{ permission.label }}</li>
                        </ul>
                    </div>
                </div>
            </details>
            <p v-if="affectsCurrentAccount" class="roles-page__field-help">
                当前账号持有此角色，保存后会更新当前账号的权限。
            </p>
        </template>
    </ManagementDialog>
</template>

<style scoped lang="scss">
@font-face {
    font-family: 'Admin UI Latin';
    src: local('Segoe UI'), local('Helvetica Neue'), local('Arial'), local('Roboto'),
        local('Liberation Sans'), local('Noto Sans');
    unicode-range: U+0020-007E, U+00C0-024F;
}

:global(.roles-page) {
    --el-font-family: 'Admin UI Latin', var(--tk-font-family);

    font-family: var(--el-font-family);
}

.roles-page {
    .roles-page__list-error,
    .roles-page__empty {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 12px;
    }

    .roles-page__list-error {
        p {
            margin: 0;
        }
    }

    .roles-page__empty {
        justify-content: center;
        padding-block: 12px;
        line-height: 1.5;
    }

    .roles-page__name {
        font-weight: 600;
    }

    .roles-page__system-role {
        margin-inline-start: 6px;
    }

    :deep(.roles-page__code) {
        color: var(--tk-color-text-secondary);
    }

    :deep(.roles-page__count) {
        font-variant-numeric: tabular-nums;
    }

    .roles-page__permission-action {
        text-decoration: underline;
        text-underline-offset: 0.2em;

        &:focus-visible {
            outline: 2px solid var(--tk-color-focus-ring);
            outline-offset: 2px;
        }
    }

    .roles-page__field-help {
        margin: 0;
        color: var(--tk-color-text-secondary);
        line-height: 1.5;
    }

    .roles-page__permissions {
        display: grid;
        min-height: 80px;
        max-height: 48dvh;
        padding-inline-end: 4px;
        overflow-y: auto;

        :deep(.el-checkbox-group) {
            display: grid;
            gap: 12px;
        }

        .roles-page__permission-group {
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

            .roles-page__permission-options {
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

    .roles-page__permission-changes {
        padding: 8px 12px;
        border: 1px solid var(--tk-color-border);
        border-radius: var(--tk-radius-base);

        summary {
            cursor: pointer;
            font-weight: 600;

            &:focus-visible {
                outline: 2px solid var(--tk-color-focus-ring);
                outline-offset: 2px;
            }
        }

        .roles-page__permission-change-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 24px;
            max-height: 20dvh;
            margin-block-start: 8px;
            overflow-y: auto;
            overflow-wrap: anywhere;

            p {
                margin: 0;
                font-weight: 600;
            }

            ul {
                margin: 0;
                padding-inline-start: 20px;
            }
        }
    }
}
</style>
