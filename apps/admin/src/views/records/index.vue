<script setup lang="ts">
import { ElDrawer, ElMessage, ElPagination } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { apiErrorMessage, getRecord, listRecords, type RecordDetail, type RecordItem, type RecordState } from '@/api'
import { Icon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import ManagementTable from '../access/ManagementTable.vue'
import RecordDetails from './RecordDetails.vue'
import RecordEditor from './RecordEditor.vue'
import RecordImagePreview from './RecordImagePreview.vue'
import RecordVoidDialog from './RecordVoidDialog.vue'
import { formatRecordTime, recordStateLabels } from './record-display'

const auth = useAuthStore()
const search = ref('')
const status = ref<RecordState | 'all'>('all')
const statusTypes = { current: 'success', historical: 'info', voided: 'danger' } as const
const records = shallowRef<RecordItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(true)
const loadError = ref('')
let listRequest: AbortController | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const detailsOpen = ref(false)
const detailRow = shallowRef<RecordItem>()
const detail = shallowRef<RecordDetail>()
const detailError = ref('')
const loadingDetail = ref(false)
let detailRequest: AbortController | undefined

const createOpen = ref(false)
const creating = ref(false)
const editOpen = ref(false)
const editing = shallowRef<RecordItem>()
const saving = ref(false)
const voiding = shallowRef<RecordItem>()
const previewOpen = ref(false)
const previewUrl = ref('')
const previewTitle = ref('')

async function loadRecords(requestedPage = page.value) {
    clearTimeout(searchTimer)
    listRequest?.abort()
    const request = new AbortController()
    listRequest = request
    loading.value = true
    loadError.value = ''
    try {
        const result = await listRecords({ q: search.value.trim(), state: status.value, page: requestedPage }, request.signal)
        if (!request.signal.aborted) {
            records.value = result.items
            page.value = result.page
            pageSize.value = result.pageSize
            total.value = result.total
        }
    } catch (error) {
        if (!request.signal.aborted) {
            records.value = []
            total.value = 0
            loadError.value = apiErrorMessage(error)
        }
    } finally {
        if (listRequest === request) loading.value = false
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
    void loadRecords()
}

function afterEdit() {
    editOpen.value = false
    ElMessage.success('成绩资料已保存')
    void loadRecords()
}

function afterVoid() {
    ElMessage.success('成绩已作废')
    void loadRecords()
}

watch(search, () => {
    clearTimeout(searchTimer)
    listRequest?.abort()
    listRequest = undefined
    loading.value = true
    searchTimer = setTimeout(() => { void loadRecords(1) }, 250)
})
watch(status, () => { void loadRecords(1) })
watch(detailsOpen, open => { if (!open) detailRequest?.abort() })
onBeforeRouteLeave(() => !creating.value)
onMounted(() => { void loadRecords() })
onBeforeUnmount(() => {
    clearTimeout(searchTimer)
    listRequest?.abort()
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
                <el-select v-model="status" aria-label="筛选成绩状态">
                    <el-option label="全部状态" value="all" />
                    <el-option v-for="(label, value) in recordStateLabels" :key="value" :label="label" :value="value" />
                </el-select>
            </template>
            <template v-if="auth.can('records:create')" #actions>
                <el-button type="primary" @click="createOpen = true">
                    <template #icon><Icon icon="ep:plus" aria-hidden="true" /></template>
                    新增记录
                </el-button>
            </template>
            <template #error>
                <p role="alert">{{ loadError }}</p>
                <el-button link type="primary" @click="loadRecords()">重试</el-button>
            </template>

            <div class="admin-records__results" :aria-busy="loading">
                <div class="admin-records__table">
                    <el-table v-loading="loading" :data="records" row-key="id" height="100%" :scrollbar-tabindex="0"
                        :empty-text="loadError ? '列表加载失败' : search.trim() || status !== 'all' ? '没有匹配的记录' : '暂无记录'">
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="赛道预览图" width="144">
                            <template #default="{ row }">
                                <RecordImagePreview :src="row.trackCoverUrl" :track-name="row.trackName" label="赛道封面" @preview="showPreview" />
                            </template>
                        </el-table-column>
                        <el-table-column label="赛道" prop="trackName" min-width="110" show-overflow-tooltip />
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="成绩" width="100">
                            <template #default="{ row }"><strong>{{ formatRecordTime(row.timeMs) }}</strong></template>
                        </el-table-column>
                        <el-table-column label="车手" prop="driverName" min-width="96" show-overflow-tooltip />
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="车队" min-width="96" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.teamName || '—' }}</template>
                        </el-table-column>
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="达成日期" prop="achievedAt" min-width="120" />
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="状态" width="88">
                            <template #default="{ row }">
                                <el-tag :type="statusTypes[row.state]">{{ recordStateLabels[row.state] }}</el-tag>
                            </template>
                        </el-table-column>
                        <!-- @vue-generic {RecordItem} -->
                        <el-table-column label="操作" width="168">
                            <template #default="{ row }">
                                <div class="management-table__row-actions">
                                    <el-button link type="primary" @click="loadDetails(row)">详情</el-button>
                                    <el-button v-if="auth.can('records:update')" link type="primary" @click="openEditor(row)">编辑资料</el-button>
                                    <el-button v-if="row.state !== 'voided' && auth.can('records:void')" link type="danger"
                                        @click="voiding = row">作废</el-button>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                <ElPagination v-if="total > pageSize" class="admin-records__pagination" aria-label="成绩分页"
                    layout="total, prev, pager, next" :pager-count="5" :current-page="page" :page-size="pageSize"
                    :total="total" :disabled="loading" @update:current-page="loadRecords" />
            </div>
        </ManagementTable>

        <ElDrawer v-model="createOpen" title="新增记录" direction="rtl" size="min(640px, 100vw)" destroy-on-close
            :close-on-click-modal="!creating" :close-on-press-escape="!creating" :show-close="!creating">
            <RecordEditor v-model:saving="creating" @saved="afterCreate" @cancel="createOpen = false" @preview-track-cover="showPreview" />
        </ElDrawer>
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
