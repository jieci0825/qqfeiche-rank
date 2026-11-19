<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    apiErrorMessage, assignUserRoles, createUser, listAssignableRoles, listRoles, listUsers, resetUserPassword,
    setUserStatus, updateUser, type User,
} from '@/api'
import { useAuthStore } from '@/stores/auth'
import ManagementDialog from '../access/ManagementDialog.vue'
import ManagementTable from '../access/ManagementTable.vue'
import { useManagementList } from '../access/use-management-list'

type UserEditor = { kind: 'create' } | { kind: 'edit' | 'password' | 'roles'; user: User }

const auth = useAuthStore()
const users = useManagementList(async signal => (await listUsers(signal)).users)
const roles = useManagementList(async signal => (await listRoles(signal)).roles, auth.can('roles:read'))
const assignableRoles = useManagementList(
    async signal => (await listAssignableRoles(signal)).roles,
    auth.can('users:assign-roles') && !auth.can('roles:read'),
)
const search = ref('')
const status = ref<'all' | 'enabled' | 'disabled'>('all')
const editor = shallowRef<UserEditor>({ kind: 'create' })
const editorOpen = ref(false)
const form = reactive({ username: '', displayName: '', password: '', roleIds: [] as number[] })
const saving = ref(false)
const saveError = ref('')
const changingStatusId = ref<number>()

const visibleUsers = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    return users.items.value.filter(user =>
        (status.value === 'all' || user.isActive === (status.value === 'enabled')) &&
        [user.username, user.displayName].some(value => value.toLowerCase().includes(keyword)),
    )
})
const roleNames = computed(() => new Map(
    [...auth.roles, ...roles.items.value, ...assignableRoles.items.value].map(role => [role.id, role.name]),
))
const showActions = computed(() => ['update', 'assign-roles', 'reset-password', 'enable', 'disable']
    .some(action => auth.can(`users:${action}`)))
const outOfScope = computed(() => {
    const current = editor.value
    if (current.kind !== 'roles' || assignableRoles.loading.value || assignableRoles.error.value) return false
    const allowedIds = new Set(assignableRoles.items.value.map(role => role.id))
    return current.user.roleIds.some(id => !allowedIds.has(id))
})
const editorTitle = computed(() => {
    const current = editor.value
    if (current.kind === 'create') return '新增用户'
    const action = { edit: '编辑用户', password: '重置密码', roles: '分配角色' }[current.kind]
    return `${action} · ${current.user.username}`
})
const loginDate = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short', hour12: false })

function openEditor(next: UserEditor) {
    editor.value = next
    form.username = ''
    form.displayName = next.kind === 'edit' ? next.user.displayName : ''
    form.password = ''
    form.roleIds = next.kind === 'roles' ? [...next.user.roleIds] : []
    saveError.value = ''
    editorOpen.value = true
    if (next.kind === 'roles') void assignableRoles.load()
}

async function refreshAfterChange(ownAccountChanged: boolean) {
    if (ownAccountChanged) {
        await auth.reloadAccess().catch(() => {
            if (auth.isLoggedIn) ElMessage.warning('更新已保存，当前会话信息刷新失败，请重新登录')
        })
    }
    if (auth.can('users:read')) await users.load()
}

async function submitEditor() {
    if (saving.value) return
    const current = editor.value
    const { password, roleIds } = form
    const username = form.username.trim()
    const displayName = form.displayName.trim()
    if (current.kind === 'create' && !username) {
        saveError.value = '请输入用户名'
        return
    }
    if ((current.kind === 'create' || current.kind === 'edit') && !displayName) {
        saveError.value = '请输入显示名称'
        return
    }
    if ((current.kind === 'create' || current.kind === 'password') && !password) {
        saveError.value = '请输入密码'
        return
    }
    if (current.kind === 'roles' && (outOfScope.value || assignableRoles.loading.value || assignableRoles.error.value)) return

    const ownAccountChanged = current.kind !== 'create' && current.user.id === auth.admin?.id
    saving.value = true
    saveError.value = ''
    try {
        switch (current.kind) {
            case 'create':
                await createUser({ username, displayName, password })
                break
            case 'edit':
                await updateUser(current.user.id, displayName)
                break
            case 'password':
                await resetUserPassword(current.user.id, password)
                break
            case 'roles':
                await assignUserRoles(current.user.id, [...roleIds])
                break
        }
        form.password = ''
        editorOpen.value = false
        ElMessage.success({
            create: '用户已新增',
            edit: '用户已更新',
            password: '密码已重置',
            roles: '用户角色已更新',
        }[current.kind])
        await refreshAfterChange(ownAccountChanged)
    } catch (error) {
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
    }
}

async function changeStatus(user: User) {
    if (changingStatusId.value !== undefined) return
    const enabling = !user.isActive
    const action = enabling ? '启用' : '停用'
    const ownAccessChanged = !enabling && user.id === auth.admin?.id
    const message = enabling
        ? `启用「${user.username}」后，该用户可以登录后台。`
        : `停用「${user.username}」会撤销该用户的登录会话。`

    changingStatusId.value = user.id
    try {
        await ElMessageBox.confirm(message, `${action}用户`, {
            type: 'warning',
            confirmButtonText: action,
            cancelButtonText: '取消',
        })
        await setUserStatus(user.id, enabling)
        ElMessage.success(`用户已${action}`)
        await refreshAfterChange(ownAccessChanged)
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') ElMessage.error(apiErrorMessage(error))
    } finally {
        changingStatusId.value = undefined
    }
}

function formatRoles(roleIds: number[]) {
    return roleIds.map(id => roleNames.value.get(id) ?? `角色 #${id}`).join('、') || '未分配'
}

function clearPassword() {
    if (!editorOpen.value) form.password = ''
}
</script>

<template>
    <ManagementTable :loading="users.loading.value" :error="users.error.value" @refresh="users.load">
        <template #filters>
            <el-input v-model="search" aria-label="搜索用户名或显示名称" placeholder="搜索用户名或显示名称" clearable />
            <el-select v-model="status" aria-label="筛选用户状态">
                <el-option label="全部状态" value="all" />
                <el-option label="启用" value="enabled" />
                <el-option label="停用" value="disabled" />
            </el-select>
        </template>
        <template v-if="auth.can('users:create')" #actions>
            <el-button type="primary" :disabled="saving" @click="openEditor({ kind: 'create' })">新增用户</el-button>
        </template>

        <el-table v-loading="users.loading.value" :data="visibleUsers" row-key="id"
            :empty-text="users.error.value ? '列表加载失败' : search || status !== 'all' ? '没有匹配的用户' : '暂无用户'">
            <el-table-column label="用户名" prop="username" min-width="120" show-overflow-tooltip />
            <el-table-column label="显示名称" prop="displayName" min-width="120" show-overflow-tooltip />
            <el-table-column label="角色" min-width="136" show-overflow-tooltip>
                <template #default="{ row }">{{ formatRoles(row.roleIds) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="86">
                <template #default="{ row }">
                    <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="最近登录" min-width="148">
                <template #default="{ row }">
                    {{ row.lastLoginAt ? loginDate.format(new Date(row.lastLoginAt)) : '从未登录' }}
                </template>
            </el-table-column>
            <!-- @vue-generic {User} -->
            <el-table-column v-if="showActions" label="操作" width="232">
                <template #default="{ row }">
                    <el-button v-if="auth.can('users:update')" link type="primary" :disabled="saving"
                        @click="openEditor({ kind: 'edit', user: row })">编辑</el-button>
                    <el-button v-if="auth.can('users:assign-roles')" link type="primary" :disabled="saving"
                        @click="openEditor({ kind: 'roles', user: row })">分配角色</el-button>
                    <el-button v-if="auth.can('users:reset-password')" link type="primary" :disabled="saving"
                        @click="openEditor({ kind: 'password', user: row })">重置密码</el-button>
                    <el-button v-if="auth.can(row.isActive ? 'users:disable' : 'users:enable')" link
                        :type="row.isActive ? 'danger' : 'primary'" :loading="changingStatusId === row.id"
                        :disabled="changingStatusId !== undefined" @click="changeStatus(row)">
                        {{ row.isActive ? '停用' : '启用' }}
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </ManagementTable>

    <ManagementDialog v-model="editorOpen" :title="editorTitle" :saving="saving" :error="saveError"
        :submit-disabled="editor.kind === 'roles' && (assignableRoles.loading.value || !!assignableRoles.error.value || outOfScope)"
        @submit="submitEditor" @closed="clearPassword">
        <el-form-item v-if="editor.kind === 'create'" label="用户名" for="user-username">
            <el-input id="user-username" v-model="form.username" maxlength="64" autocomplete="off" />
        </el-form-item>
        <el-form-item v-if="editor.kind === 'create' || editor.kind === 'edit'" label="显示名称" for="user-display-name">
            <el-input id="user-display-name" v-model="form.displayName" maxlength="64" />
        </el-form-item>
        <el-form-item v-if="editor.kind === 'create' || editor.kind === 'password'"
            :label="editor.kind === 'password' ? '新密码' : '初始密码'" for="user-new-password">
            <el-input id="user-new-password" v-model="form.password" type="password" maxlength="256"
                autocomplete="new-password" show-password />
        </el-form-item>
        <p v-if="editor.kind === 'password'">保存后，该用户需要使用新密码重新登录。</p>
        <template v-if="editor.kind === 'roles'">
            <div v-if="assignableRoles.error.value">
                <p role="alert">{{ assignableRoles.error.value }}</p>
                <el-button link type="primary" @click="assignableRoles.load">重新加载角色</el-button>
            </div>
            <p v-else-if="outOfScope" role="alert">该用户已有角色超出你的管理范围，无法修改角色分配。</p>
            <el-form-item v-else label="角色" for="user-roles">
                <el-select id="user-roles" v-model="form.roleIds" multiple filterable
                    :loading="assignableRoles.loading.value" :disabled="assignableRoles.loading.value"
                    placeholder="选择角色" no-data-text="暂无可分配角色">
                    <el-option v-for="role in assignableRoles.items.value" :key="role.id"
                        :label="role.name" :value="role.id" />
                </el-select>
            </el-form-item>
        </template>
    </ManagementDialog>
</template>
