<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@/icons'
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
const form = reactive({ name: '', sortOrder: '0' })
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
    <ManagementTable class="admin-tracks" :error="loadError">
        <template #search>
            <el-input v-model="search" aria-label="搜索赛道名称" placeholder="搜索赛道名称" clearable>
                <template #prefix>
                    <Icon icon="ep:search" aria-hidden="true" />
                </template>
            </el-input>
            <el-select v-model="status" aria-label="筛选赛道状态">
                <el-option label="全部状态" value="all" />
                <el-option label="启用" value="active" />
                <el-option label="已归档" value="archived" />
            </el-select>
        </template>
        <template #actions>
            <el-button type="primary" :disabled="saving" @click="openEditor()">
                <template #icon>
                    <Icon icon="ep:plus" aria-hidden="true" />
                </template>
                新增赛道
            </el-button>
        </template>

        <template #error>
            <div class="admin-tracks__load-error">
                <p role="alert">{{ loadError }}</p>
                <el-button @click="loadTracks">重试</el-button>
            </div>
        </template>

        <div v-loading="loading" class="admin-tracks__results" :aria-busy="loading">
            <div class="admin-tracks__scroll" role="region" aria-label="赛道结果" tabindex="0">
                <ul v-if="visibleTracks.length" class="admin-tracks__grid" role="list" aria-label="赛道列表">
                    <li v-for="track in visibleTracks" :key="track.id" class="admin-tracks__card">
                        <div class="admin-tracks__summary">
                            <div class="admin-tracks__media">
                                <el-image v-if="track.coverUrl" :key="track.coverUrl" class="admin-tracks__image"
                                    :src="track.coverUrl" :alt="`${track.name}赛道封面`" fit="cover" loading="lazy">
                                    <template #error>
                                        <div class="admin-tracks__media-empty">
                                            <Icon icon="ep:picture" aria-hidden="true" />
                                            <span>封面加载失败</span>
                                        </div>
                                    </template>
                                </el-image>
                                <div v-else class="admin-tracks__media-empty">
                                    <Icon icon="ep:picture" aria-hidden="true" />
                                    <span>暂无封面</span>
                                </div>
                            </div>

                            <div class="admin-tracks__identity">
                                <h2 class="admin-tracks__name">{{ track.name }}</h2>
                                <p class="admin-tracks__status" :class="{ 'is-active': track.status === 'active' }">
                                    {{ track.status === 'active' ? '已启用' : '已归档' }}
                                </p>
                            </div>
                        </div>

                        <div class="admin-tracks__card-footer">
                            <p class="admin-tracks__sort">
                                <span>排序值</span> <strong>{{ track.sortOrder }}</strong>
                            </p>
                            <div class="admin-tracks__card-actions">
                                <el-button size="small" plain :aria-label="`编辑赛道 ${track.name}`" :disabled="saving"
                                    @click="openEditor(track)">
                                    <template #icon>
                                        <Icon icon="ep:edit" aria-hidden="true" />
                                    </template>
                                    编辑
                                </el-button>
                                <el-button v-if="track.status === 'active'" size="small" type="danger"
                                    :aria-label="`归档赛道 ${track.name}`"
                                    :loading="archivingId === track.id" :disabled="archivingId !== undefined"
                                    @click="confirmArchive(track)">归档</el-button>
                            </div>
                        </div>
                    </li>
                </ul>
                <p v-else-if="!loading && !loadError" class="admin-tracks__empty" role="status">
                    {{ search.trim() || status !== 'all' ? '没有匹配的赛道' : '暂无赛道' }}
                </p>
            </div>
        </div>
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
.admin-tracks {
    .admin-tracks__load-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .admin-tracks__results {
        height: 100%;

        .admin-tracks__scroll {
            height: 100%;
            overflow: auto;

            &:focus-visible {
                outline: 2px solid var(--tk-color-focus-ring);
                outline-offset: -2px;
            }

            .admin-tracks__grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(min(100%, 224px), 1fr));
                gap: 16px;
                margin: 0;
                padding: 0;
                list-style: none;

                .admin-tracks__card {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    min-width: 0;
                    padding: 12px;
                    border: 1px solid var(--tk-color-border);
                    border-radius: var(--tk-radius-base);
                    background: var(--tk-color-bg-surface);

                    .admin-tracks__summary {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;

                        .admin-tracks__media {
                            width: 100%;
                            aspect-ratio: 16 / 9;
                            overflow: hidden;
                            border-radius: var(--tk-radius-base);
                            background: var(--tk-color-bg-page);

                            .admin-tracks__image,
                            .admin-tracks__media-empty {
                                width: 100%;
                                height: 100%;
                            }

                            .admin-tracks__image {
                                display: block;
                            }

                            .admin-tracks__media-empty {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                gap: 6px;
                                color: var(--tk-color-text-secondary);
                                font-size: 12px;
                                line-height: 1.2;
                                text-align: center;

                                svg {
                                    font-size: 20px;
                                }
                            }
                        }

                        .admin-tracks__identity {
                            display: flex;
                            flex-wrap: wrap;
                            align-items: center;
                            gap: 4px 12px;

                            .admin-tracks__name {
                                flex: 1 1 6em;
                                min-width: 0;
                                margin: 0;
                                font-size: 18px;
                                line-height: 1.35;
                                overflow-wrap: anywhere;
                            }

                            .admin-tracks__status {
                                display: flex;
                                align-items: center;
                                gap: 5px;
                                margin: 0;
                                color: var(--tk-color-text-secondary);
                                font-size: 13px;
                                line-height: 1.3;
                                overflow-wrap: anywhere;

                                &::before {
                                    flex: none;
                                    width: 6px;
                                    height: 6px;
                                    border-radius: 50%;
                                    background: var(--tk-color-text-tertiary);
                                    content: '';
                                }

                                &.is-active::before {
                                    background: color-mix(in srgb, var(--tk-color-success) 70%, var(--tk-color-text-primary));
                                }
                            }
                        }
                    }

                    .admin-tracks__card-footer {
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 6px 8px;
                        margin-block-start: auto;
                        padding-block-start: 8px;
                        border-top: 1px solid var(--tk-color-border-disabled);

                        .admin-tracks__sort {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 2px 5px;
                            min-width: 0;
                            margin: 0;
                            color: var(--tk-color-text-secondary);
                            font-size: 13px;
                            font-variant-numeric: tabular-nums;
                            line-height: 1.4;
                            overflow-wrap: anywhere;

                            strong {
                                min-width: 0;
                                color: var(--tk-color-text-primary);
                                font-weight: 600;
                            }
                        }

                        .admin-tracks__card-actions {
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: flex-end;
                            gap: 4px;
                            margin-inline-start: auto;

                            .el-button {
                                min-height: 28px;
                                margin-inline-start: 0;

                                &:focus-visible {
                                    outline: 2px solid var(--tk-color-focus-ring);
                                    outline-offset: 2px;
                                }
                            }
                        }
                    }
                }
            }

            .admin-tracks__empty {
                margin: 0;
                padding: 40px 16px;
                color: var(--tk-color-text-secondary);
                text-align: center;
            }
        }
    }
}

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
