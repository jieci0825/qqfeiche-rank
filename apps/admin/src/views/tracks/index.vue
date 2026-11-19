<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    ApiError,
    apiErrorMessage,
    archiveTrack,
    listTracks,
    saveTrack,
    uploadTrackCover,
    type Track,
} from '@/api'
import ManagementTable from '../access/ManagementTable.vue'

const tracks = ref<Track[]>([])
const search = ref('')
const status = ref<Track['status'] | 'all'>('all')
const loading = ref(false)
const loadError = ref('')
let listRequest: AbortController | undefined

const editorOpen = ref(false)
const editingId = ref<number>()
const form = reactive({ name: '', description: '', sortOrder: '0' })
const saving = ref(false)
const saveError = ref('')
let saveRequest: AbortController | undefined

const coverTypes = ['image/jpeg', 'image/png', 'image/webp']
const coverInput = ref<HTMLInputElement>()
const existingCoverUrl = ref<string | null>(null)
const removeExistingCover = ref(false)
const selectedCover = shallowRef<File>()
const coverPreview = ref('')
const visibleCover = computed(() => coverPreview.value || (removeExistingCover.value ? null : existingCoverUrl.value))
const coverError = ref('')
const uploadingCover = ref(false)
let coverTicket: string | undefined

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
    clearCoverSelection()
    editingId.value = track?.id
    form.name = track?.name ?? ''
    existingCoverUrl.value = track?.coverUrl ?? null
    removeExistingCover.value = false
    form.description = track?.description ?? ''
    form.sortOrder = String(track?.sortOrder ?? 0)
    saveError.value = ''
    editorOpen.value = true
}

function clearCoverSelection() {
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    selectedCover.value = undefined
    coverPreview.value = ''
    coverError.value = ''
    coverTicket = undefined
}

function cancelCoverSelection() {
    clearCoverSelection()
    saveError.value = ''
}

function toggleCoverRemoval() {
    removeExistingCover.value = !removeExistingCover.value
    saveError.value = ''
}

function selectCover(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || saving.value || !editorOpen.value) return

    clearCoverSelection()
    saveError.value = ''
    if (!coverTypes.includes(file.type)) {
        coverError.value = '请选择 JPEG、PNG 或 WebP 图片'
        return
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        coverError.value = '封面须大于 0 字节且不超过 5 MB'
        return
    }
    selectedCover.value = file
    coverPreview.value = URL.createObjectURL(file)
}

async function submit() {
    if (saving.value || coverError.value) return

    const name = form.name.trim()
    const sortOrder = Number(form.sortOrder)
    if (!name || !form.sortOrder.trim() || !Number.isSafeInteger(sortOrder)) {
        saveError.value = '请输入赛道名称和整数排序值'
        return
    }

    const request = new AbortController()
    saveRequest = request
    saving.value = true
    saveError.value = ''
    try {
        if (selectedCover.value && !coverTicket) {
            uploadingCover.value = true
            const ticket = await uploadTrackCover(selectedCover.value, request.signal)
            request.signal.throwIfAborted()
            coverTicket = ticket
            uploadingCover.value = false
        }
        await saveTrack({
            name,
            sortOrder,
            coverUploadTicket: coverTicket ?? (removeExistingCover.value ? null : undefined),
            description: form.description.trim() || null,
        }, editingId.value, request.signal)
        request.signal.throwIfAborted()
        editorOpen.value = false
        ElMessage.success('赛道已保存')
        await loadTracks()
    } catch (error) {
        if (request.signal.aborted) return
        if (error instanceof ApiError && ['INVALID_UPLOAD_TICKET', 'UPLOAD_EXPIRED', 'UPLOAD_NOT_FOUND'].includes(error.code)) {
            coverTicket = undefined
        }
        saveError.value = apiErrorMessage(error)
    } finally {
        saveRequest = undefined
        uploadingCover.value = false
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
watch(editorOpen, open => {
    if (!open) clearCoverSelection()
})
onBeforeUnmount(() => {
    listRequest?.abort()
    saveRequest?.abort()
    clearCoverSelection()
})
</script>

<template>
    <ManagementTable :error="loadError">
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
            <el-form-item class="admin-tracks__field" label="赛道封面（选填）">
                <div class="admin-tracks__cover">
                    <el-image v-if="visibleCover" :key="visibleCover" class="admin-tracks__cover-preview"
                        :src="visibleCover" fit="contain" :alt="selectedCover ? '新封面预览' : '当前赛道封面'">
                        <template #error>
                            <span class="admin-tracks__cover-note">无法预览此图片</span>
                        </template>
                    </el-image>
                    <input ref="coverInput" type="file" :accept="coverTypes.join(',')" hidden @change="selectCover" />
                    <div class="admin-tracks__cover-controls">
                        <el-button aria-describedby="track-cover-hint" @click="coverInput?.click()">
                            {{ visibleCover ? '更换图片' : '选择图片' }}
                        </el-button>
                        <el-button v-if="selectedCover || coverError" link @click="cancelCoverSelection">
                            {{ selectedCover ? '取消选择' : '清除提示' }}
                        </el-button>
                        <el-button v-else-if="existingCoverUrl" link :type="removeExistingCover ? 'primary' : 'danger'"
                            @click="toggleCoverRemoval">
                            {{ removeExistingCover ? '撤销移除' : '移除封面' }}
                        </el-button>
                    </div>
                    <div id="track-cover-hint" class="admin-tracks__cover-note" aria-live="polite">
                        支持 JPEG、PNG、WebP，最大 5 MB。
                        <div v-if="selectedCover" class="admin-tracks__cover-filename">
                            已选择「{{ selectedCover.name }}」，保存时上传。
                        </div>
                        <div v-else-if="removeExistingCover">封面将在保存后移除。</div>
                    </div>
                    <p v-if="coverError" class="admin-tracks__error" role="alert">{{ coverError }}</p>
                </div>
            </el-form-item>
            <el-form-item class="admin-tracks__field" label="描述" for="track-description">
                <el-input id="track-description" v-model="form.description" type="textarea" :rows="3"
                    maxlength="1000" />
            </el-form-item>
            <p v-if="saveError" class="admin-tracks__error" role="alert">{{ saveError }}</p>
            <div class="admin-tracks__actions">
                <el-button @click="editorOpen = false">取消</el-button>
                <el-button type="primary" native-type="submit" :loading="saving" :disabled="Boolean(coverError)">
                    {{ uploadingCover ? '正在上传封面' : saving ? '正在保存' : '保存' }}
                </el-button>
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

        .admin-tracks__cover {
            display: grid;
            gap: 8px;
            width: 100%;
            min-width: 0;

            .admin-tracks__cover-preview {
                display: grid;
                place-items: center;
                width: 168px;
                max-width: 100%;
                height: 96px;
            }

            .admin-tracks__cover-controls {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
            }

            .admin-tracks__cover-note {
                margin: 0;
                color: var(--tk-color-text-secondary);
                line-height: 1.5;

                .admin-tracks__cover-filename {
                    overflow-wrap: anywhere;
                }
            }
        }
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
