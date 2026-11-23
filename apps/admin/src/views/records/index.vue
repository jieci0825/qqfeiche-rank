<script setup lang="ts">
import { ElDrawer, ElMessage, ElPagination } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import {
    apiErrorMessage, getRecord, listRecordTracks, listTrackRuns,
    type RecordDetail, type RecordItem, type RecordTrack, type RecordTrackFilter,
} from '@/api'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import ManagementTable from '../access/ManagementTable.vue'
import RecordDetails from './RecordDetails.vue'
import RecordEditor from './RecordEditor.vue'
import RecordImagePreview from './RecordImagePreview.vue'
import RecordVoidDialog from './RecordVoidDialog.vue'
import { formatRecordTime, recordStatusLabels } from './record-display'

const auth = useAuthStore()
const search = ref('')
const status = ref<RecordTrackFilter>('all')
const tracks = shallowRef<RecordTrack[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(true)
const loadError = ref('')
let listRequest: AbortController | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const historyOpen = ref(false)
const historyTrack = shallowRef<RecordTrack>()
const history = shallowRef<RecordItem[]>([])
const historyError = ref('')
const loadingHistory = ref(false)
let historyRequest: AbortController | undefined

const detailsOpen = ref(false)
const detailRow = shallowRef<RecordItem>()
const detail = shallowRef<RecordDetail>()
const detailError = ref('')
const loadingDetail = ref(false)
let detailRequest: AbortController | undefined

const createOpen = ref(false)
const createSource = shallowRef<RecordTrack>()
const creating = ref(false)
const editOpen = ref(false)
const editing = shallowRef<RecordItem>()
const saving = ref(false)
const voiding = shallowRef<RecordItem>()
const previewOpen = ref(false)
const previewUrl = ref('')
const previewTitle = ref('')

async function loadTracks(requestedPage = page.value) {
    clearTimeout(searchTimer)
    listRequest?.abort()
    const request = new AbortController()
    listRequest = request
    loading.value = true
    loadError.value = ''
    try {
        const result = await listRecordTracks({ q: search.value.trim(), state: status.value, page: requestedPage }, request.signal)
        if (!request.signal.aborted) {
            tracks.value = result.items
            page.value = result.page
            pageSize.value = result.pageSize
            total.value = result.total
        }
    } catch (error) {
        if (!request.signal.aborted) {
            tracks.value = []
            total.value = 0
            loadError.value = apiErrorMessage(error)
        }
    } finally {
        if (listRequest === request) loading.value = false
    }
}

async function loadHistory(track: RecordTrack) {
    historyRequest?.abort()
    const request = new AbortController()
    historyRequest = request
    historyTrack.value = track
    history.value = []
    historyError.value = ''
    loadingHistory.value = true
    historyOpen.value = true
    try {
        const result = await listTrackRuns(track.id, request.signal)
        if (!request.signal.aborted) history.value = result.items
    } catch (error) {
        if (!request.signal.aborted) historyError.value = apiErrorMessage(error)
    } finally {
        if (historyRequest === request) loadingHistory.value = false
    }
}

async function loadDetails(row: RecordItem) {
    detailRequest?.abort()
    const request = new AbortController()
    detailRequest = request
    detailRow.value = row
    detail.value = undefined
    detailError.value = ''
    loadingDetail.value = true
    detailsOpen.value = true
    try {
        const result = await getRecord(row.id, request.signal)
        if (!request.signal.aborted) detail.value = result.record
    } catch (error) {
        if (!request.signal.aborted) detailError.value = apiErrorMessage(error)
    } finally {
        if (detailRequest === request) loadingDetail.value = false
    }
}

function openCreate(track?: RecordTrack) {
    createSource.value = track
    createOpen.value = true
}

function openEditor(row: RecordItem) {
    editing.value = row
    editOpen.value = true
}

function showPreview(url: string, title = '赛道封面') {
    previewUrl.value = url
    previewTitle.value = title
    previewOpen.value = true
}

function afterCreate() {
    createOpen.value = false
    ElMessage.success('成绩已录入')
    void loadTracks(1)
}

function refreshAfterChange() {
    void loadTracks()
    if (historyOpen.value && historyTrack.value) void loadHistory(historyTrack.value)
}

function afterEdit() {
    editOpen.value = false
    ElMessage.success('成绩资料已保存')
    refreshAfterChange()
}

function afterVoid() {
    ElMessage.success('成绩已作废')
    refreshAfterChange()
}

watch(search, () => {
    clearTimeout(searchTimer)
    listRequest?.abort()
    listRequest = undefined
    loading.value = true
    searchTimer = setTimeout(() => { void loadTracks(1) }, 250)
})
watch(status, () => { void loadTracks(1) })
watch(historyOpen, open => { if (!open) historyRequest?.abort() })
watch(detailsOpen, open => { if (!open) detailRequest?.abort() })
onBeforeRouteLeave(() => !creating.value)
onMounted(() => { void loadTracks() })
onBeforeUnmount(() => {
    clearTimeout(searchTimer)
    listRequest?.abort()
    historyRequest?.abort()
    detailRequest?.abort()
})
</script>

<template>
    <div class="admin-records">
        <ManagementTable :error="loadError">
            <template #search>
                <el-input v-model="search" placeholder="搜索赛道、车手或车队" aria-label="搜索赛道、车手或车队"
                    maxlength="100" clearable>
                    <template #prefix><Icon icon="ep:search" aria-hidden="true" /></template>
                </el-input>
                <el-select v-model="status" aria-label="筛选赛道记录状态">
                    <el-option label="全部状态" value="all" />
                    <el-option label="有当前纪录" value="current" />
                    <el-option label="暂无当前纪录" value="empty" />
                </el-select>
            </template>
            <template v-if="auth.can('records:create')" #actions>
                <el-button type="primary" @click="openCreate()">
                    <template #icon><Icon icon="ep:plus" aria-hidden="true" /></template>
                    首次录入
                </el-button>
            </template>
            <template #error>
                <p role="alert">{{ loadError }}</p>
                <el-button link type="primary" @click="loadTracks()">重试</el-button>
            </template>

            <div class="admin-records__results" :aria-busy="loading">
                <div class="admin-records__table">
                    <el-table v-loading="loading" :data="tracks" row-key="id" height="100%" :scrollbar-tabindex="0"
                        :empty-text="loadError ? '列表加载失败' : search.trim() || status !== 'all' ? '没有匹配的赛道' : '暂无已录入的赛道'">
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="赛道预览图" width="144">
                            <template #default="{ row }">
                                <RecordImagePreview :src="row.coverUrl" :track-name="row.name" label="赛道封面" @preview="showPreview" />
                            </template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="赛道" min-width="124">
                            <template #default="{ row }">
                                {{ row.name }}
                                <el-tag v-if="row.status !== 'active'" type="info" size="small">{{ row.status === 'archived' ? '已归档' : '已停用' }}</el-tag>
                            </template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="当前纪录" width="124">
                            <template #default="{ row }">
                                <strong v-if="row.current">{{ formatRecordTime(row.current.timeMs) }}</strong>
                                <span v-else>暂无当前纪录</span>
                            </template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="车手" min-width="96" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.current?.driverName ?? '—' }}</template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="车队" min-width="96" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.current?.teamName || '—' }}</template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="达成日期" width="124">
                            <template #default="{ row }">{{ row.current?.achievedAt ?? '—' }}</template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="保持天数" width="94">
                            <template #default="{ row }">{{ row.current ? `${row.current.holdingDays} 天` : '—' }}</template>
                        </el-table-column>
                        <!-- @vue-generic {RecordTrack} -->
                        <el-table-column label="操作" :width="auth.can('records:create') ? 168 : 96">
                            <template #default="{ row }">
                                <div class="management-table__row-actions">
                                    <el-button v-if="auth.can('records:create')" link type="primary" :disabled="row.status !== 'active'"
                                        @click="openCreate(row)">录入新纪录</el-button>
                                    <el-button link type="primary" @click="loadHistory(row)">查看记录</el-button>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                <ElPagination v-if="total > pageSize" class="admin-records__pagination" aria-label="赛道分页"
                    layout="total, prev, pager, next" :pager-count="5" :current-page="page" :page-size="pageSize"
                    :total="total" :disabled="loading" @update:current-page="loadTracks" />
            </div>
        </ManagementTable>

        <ElDrawer v-model="createOpen" :title="createSource ? '录入新纪录' : '首次录入'" direction="rtl"
            size="min(640px, 100vw)" destroy-on-close
            :close-on-click-modal="!creating" :close-on-press-escape="!creating" :show-close="!creating">
            <RecordEditor :key="createSource?.id" v-model:saving="creating" :track="createSource"
                @saved="afterCreate" @cancel="createOpen = false" @preview-track-cover="showPreview" @tracks-changed="loadTracks(1)" />
        </ElDrawer>
        <el-dialog v-model="historyOpen" :title="`${historyTrack?.name ?? ''} · 赛道记录`" width="min(820px, calc(100% - 32px))">
            <p v-if="loadingHistory" role="status">正在加载赛道记录…</p>
            <template v-else-if="historyError">
                <p role="alert">{{ historyError }}</p>
                <el-button v-if="historyTrack" link type="primary" @click="loadHistory(historyTrack)">重试</el-button>
            </template>
            <el-table v-else :data="history" row-key="id" max-height="55vh" :scrollbar-tabindex="0" empty-text="暂无成绩">
                <!-- @vue-generic {RecordItem} -->
                <el-table-column label="成绩" width="100">
                    <template #default="{ row }"><strong>{{ formatRecordTime(row.timeMs) }}</strong></template>
                </el-table-column>
                <el-table-column label="车手" prop="driverName" min-width="96" show-overflow-tooltip />
                <el-table-column label="车队" prop="teamName" min-width="96" show-overflow-tooltip />
                <el-table-column label="达成日期" prop="achievedAt" width="120" />
                <!-- @vue-generic {RecordItem} -->
                <el-table-column label="状态" width="104">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'voided' ? 'danger' : row.isCurrent ? 'success' : 'info'">
                            {{ recordStatusLabels[row.status] }}{{ row.isCurrent ? ' · 当前' : '' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <!-- @vue-generic {RecordItem} -->
                <el-table-column label="操作" width="184">
                    <template #default="{ row }">
                        <el-button link type="primary" @click="loadDetails(row)">详情</el-button>
                        <template v-if="row.status === 'valid'">
                            <el-button v-if="auth.can('records:update')" link type="primary" @click="openEditor(row)">编辑资料</el-button>
                            <el-button v-if="auth.can('records:void')" link type="danger" @click="voiding = row">作废</el-button>
                        </template>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
        <el-dialog v-model="detailsOpen" :title="`成绩详情 · ${detailRow?.trackName ?? ''}`" width="min(640px, calc(100% - 32px))">
            <p v-if="loadingDetail" role="status">正在加载成绩详情…</p>
            <template v-else-if="detailError">
                <p role="alert">{{ detailError }}</p>
                <el-button v-if="detailRow" link type="primary" @click="loadDetails(detailRow)">重试</el-button>
            </template>
            <RecordDetails v-else-if="detail" :record="detail" @preview="showPreview($event, '成绩截图')" />
        </el-dialog>
        <el-dialog v-model="editOpen" title="编辑成绩资料" width="min(720px, calc(100% - 32px))"
            align-center destroy-on-close :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving">
            <div v-if="editing" class="admin-records__editor">
                <RecordEditor :key="editing.id" v-model:saving="saving" :record="editing" @saved="afterEdit" @cancel="editOpen = false" />
            </div>
        </el-dialog>
        <RecordVoidDialog v-if="voiding" :record="voiding" @saved="afterVoid" @closed="voiding = undefined" />
        <el-dialog v-model="previewOpen" :title="previewTitle" width="min(1000px, calc(100% - 32px))" align-center>
            <el-image v-if="previewUrl" class="admin-records__full-image" :src="previewUrl" :alt="previewTitle" fit="contain">
                <template #error>{{ previewTitle }}加载失败</template>
            </el-image>
        </el-dialog>
    </div>
</template>

<style scoped lang="scss">
.admin-records {
    height: 100%;
    min-width: 0;

    .admin-records__results {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
        min-height: 0;

        .admin-records__table {
            flex: 1;
            min-height: 0;
            font-variant-numeric: tabular-nums;
        }

        .admin-records__pagination {
            justify-content: flex-end;
            flex: none;
            overflow: auto;

            @media (max-width: 640px) {
                justify-content: flex-start;
            }
        }
    }

    .admin-records__editor {
        max-height: 72dvh;
        overflow: auto;
        padding: 2px;
    }

    .admin-records__full-image {
        display: grid;
        width: 100%;
        min-height: 100px;
        place-items: center;

        :deep(.el-image__inner) {
            max-height: 72dvh;
        }
    }
}
</style>
