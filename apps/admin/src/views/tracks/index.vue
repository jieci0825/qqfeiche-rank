<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiErrorMessage, archiveTrack, listTracks, saveTrack, type Track } from '@/api'
import ManagementTable from '../access/ManagementTable.vue'

const tracks = ref<Track[]>([])
const search = ref('')
const status = ref<Track['status'] | 'all'>('all')
const loading = ref(false)
const loadError = ref('')
let listRequest: AbortController | undefined

const editorOpen = ref(false)
const editingId = ref<number>()
const form = reactive({ name: '', coverUrl: '', description: '', sortOrder: '0' })
const saving = ref(false)
const saveError = ref('')
const archivingId = ref<number>()

const visibleTracks = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    return tracks.value.filter(track =>
        (status.value === 'all' || track.status === status.value) &&
        track.name.toLowerCase().includes(keyword),
    )
})

async function loadTracks() {
    listRequest?.abort()
    const request = new AbortController()
    listRequest = request
    loading.value = true
    loadError.value = ''
    try {
        const result = await listTracks(request.signal)
        if (listRequest === request) tracks.value = result.tracks
    } catch (error) {
        if (!request.signal.aborted) loadError.value = apiErrorMessage(error)
    } finally {
        if (listRequest === request) {
            listRequest = undefined
            loading.value = false
        }
    }
}

function openEditor(track?: Track) {
    editingId.value = track?.id
    form.name = track?.name ?? ''
    form.coverUrl = track?.coverUrl ?? ''
    form.description = track?.description ?? ''
    form.sortOrder = String(track?.sortOrder ?? 0)
    saveError.value = ''
    editorOpen.value = true
}

async function submit() {
    if (saving.value) return

    const name = form.name.trim()
    const sortOrder = Number(form.sortOrder)
    if (!name || !form.sortOrder.trim() || !Number.isSafeInteger(sortOrder)) {
        saveError.value = '请输入赛道名称和整数排序值'
        return
    }

    saving.value = true
    saveError.value = ''
    try {
        await saveTrack({
            name,
            sortOrder,
            coverUrl: form.coverUrl.trim() || null,
            description: form.description.trim() || null,
        }, editingId.value)
        editorOpen.value = false
        ElMessage.success('赛道已保存')
        await loadTracks()
    } catch (error) {
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
    }
}

async function confirmArchive(track: Track) {
    if (archivingId.value !== undefined) return

    archivingId.value = track.id
    try {
        await ElMessageBox.confirm(`归档「${track.name}」？归档后会保留赛道资料及历史记录。`, '归档赛道', {
            type: 'warning',
            confirmButtonText: '确认归档',
            cancelButtonText: '取消',
        })
        await archiveTrack(track.id)
        ElMessage.success('赛道已归档')
        await loadTracks()
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') ElMessage.error(apiErrorMessage(error))
    } finally {
        archivingId.value = undefined
    }
}

onMounted(loadTracks)
onBeforeUnmount(() => listRequest?.abort())
</script>

<template>
    <ManagementTable :loading="loading" :error="loadError" @refresh="loadTracks">
        <template #search>
            <el-input v-model="search" aria-label="搜索赛道名称" placeholder="搜索赛道名称" clearable />
            <el-select v-model="status" aria-label="筛选赛道状态">
                <el-option label="全部状态" value="all" />
                <el-option label="启用" value="active" />
                <el-option label="已归档" value="archived" />
            </el-select>
        </template>
        <template #actions>
            <el-button type="primary" :disabled="saving" @click="openEditor()">新增赛道</el-button>
        </template>

        <el-table v-loading="loading" :data="visibleTracks" row-key="id" height="100%" :scrollbar-tabindex="0"
            :empty-text="search || status !== 'all' ? '没有匹配的赛道' : '暂无赛道'">
            <el-table-column label="赛道名称" prop="name" min-width="160" show-overflow-tooltip />
            <el-table-column label="排序值" prop="sortOrder" width="90" />
            <el-table-column label="状态" width="100">
                <template #default="{ row }">
                    <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                        {{ row.status === 'active' ? '启用' : '已归档' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="描述" prop="description" min-width="140" show-overflow-tooltip />
            <el-table-column label="操作" width="150">
                <template #default="{ row }">
                    <el-button link type="primary" :disabled="saving" @click="openEditor(row as Track)">编辑</el-button>
                    <el-button v-if="row.status === 'active'" link type="danger"
                        :loading="archivingId === row.id" :disabled="archivingId !== undefined"
                        @click="confirmArchive(row as Track)">归档</el-button>
                </template>
            </el-table-column>
        </el-table>
    </ManagementTable>

    <el-dialog v-model="editorOpen" :title="editingId === undefined ? '新增赛道' : '编辑赛道'"
        width="min(520px, calc(100% - 32px))" :close-on-click-modal="!saving"
        :close-on-press-escape="!saving" :show-close="!saving">
        <el-form class="admin-tracks__form" :model="form" label-position="top" :disabled="saving"
            @submit.prevent="submit">
            <el-form-item class="admin-tracks__field" label="赛道名称" for="track-name">
                <el-input id="track-name" v-model="form.name" maxlength="100" />
            </el-form-item>
            <el-form-item class="admin-tracks__field" label="排序值（越小越靠前）" for="track-sort">
                <el-input id="track-sort" v-model="form.sortOrder" type="number" step="1" />
            </el-form-item>
            <el-form-item class="admin-tracks__field" label="封面地址" for="track-cover">
                <el-input id="track-cover" v-model="form.coverUrl" maxlength="1500" />
            </el-form-item>
            <el-form-item class="admin-tracks__field" label="描述" for="track-description">
                <el-input id="track-description" v-model="form.description" type="textarea" :rows="3"
                    maxlength="1000" />
            </el-form-item>
            <p v-if="saveError" class="admin-tracks__error" role="alert">{{ saveError }}</p>
            <div class="admin-tracks__actions">
                <el-button @click="editorOpen = false">取消</el-button>
                <el-button type="primary" native-type="submit" :loading="saving">保存</el-button>
            </div>
        </el-form>
    </el-dialog>
</template>

<style scoped lang="scss">
.admin-tracks__form {
    display: grid;
    gap: 16px;

    .admin-tracks__field {
        margin-bottom: 0;
    }

    .admin-tracks__actions {
        display: flex;
        justify-content: flex-end;
    }

    .admin-tracks__error {
        margin: 0;
        color: var(--tk-color-error);
    }
}
</style>
