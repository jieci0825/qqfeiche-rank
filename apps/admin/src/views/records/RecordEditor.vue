<script setup lang="ts">
import { ElDatePicker } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useId, watch } from 'vue'
import {
    ApiError, apiErrorMessage, createRecord, getCurrentRecord, getRecordOptions, updateRecord, uploadRecordScreenshot,
    type CurrentRecord, type RecordDetail, type RecordItem, type RecordMetadata, type RecordOption, type RecordOptions, type RecordTrack,
} from '@/api'
import DataImageField from '../data/DataImageField.vue'
import RecordImagePreview from './RecordImagePreview.vue'
import { formatRecordTime } from './record-display'

const props = defineProps<{ record?: RecordItem; track?: RecordTrack }>()
const saving = defineModel<boolean>('saving', { default: false })
const emit = defineEmits<{ saved: [record: RecordDetail]; cancel: []; previewTrackCover: [src: string]; tracksChanged: [] }>()
const achievedFieldId = useId()
const screenshot = shallowRef<File | null>(null)
const screenshotError = ref('')
const removeScreenshot = ref(false)
const options = shallowRef<RecordOptions>()
const optionsError = ref('')
const current = shallowRef<CurrentRecord | null>()
const currentError = ref('')
const saveError = ref('')
const loadingOptions = ref(true)
const loadingCurrent = ref(false)
const uploading = ref(false)
const videoUrl = ref(props.record?.videoUrl ?? '')
const note = ref(props.record?.note ?? '')
let optionsRequest: AbortController | undefined
let currentRequest: AbortController | undefined
let saveRequest: AbortController | undefined
let screenshotTicket: string | undefined

const beijingDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', dateStyle: 'short',
})
const calendarDate = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short' })
const fields = reactive({
    trackId: null as number | null,
    driverId: props.record?.driverId ?? null as number | null,
    teamId: props.record?.teamId ?? null,
    carId: props.record?.carId ?? null,
    petId: props.record?.petId ?? null,
    ecu: [...(props.record?.ecu ?? [])],
    time: props.record ? formatRecordTime(props.record.timeMs) : '',
    achievedAt: beijingDate.format(),
})

function withExisting(items: RecordOption[] = [], id?: number | null, name?: string | null) {
    if (id == null || !name || items.some(item => item.id === id)) return items
    return [{ id, name: `${name}（当前关联）` }, ...items]
}

const selectedTrack = computed(() => props.track ?? options.value?.tracks.find(track => track.id === fields.trackId))
const drivers = computed(() => withExisting(options.value?.drivers, props.record?.driverId, props.record?.driverName))
const teams = computed(() => withExisting(options.value?.teams, props.record?.teamId, props.record?.teamName))
const cars = computed(() => withExisting(options.value?.cars, props.record?.carId, props.record?.carName))
const pets = computed(() => withExisting(options.value?.pets, props.record?.petId, props.record?.petName))
const ecuOptions = computed(() => [...new Set([
    ...(options.value?.cars.find(car => car.id === fields.carId)?.ecu ?? []), ...fields.ecu,
])])

async function loadOptions() {
    optionsRequest?.abort()
    const request = new AbortController()
    optionsRequest = request
    options.value = undefined
    optionsError.value = ''
    loadingOptions.value = true
    try {
        const result = await getRecordOptions(request.signal)
        if (!request.signal.aborted) options.value = result
    } catch (error) {
        if (!request.signal.aborted) optionsError.value = apiErrorMessage(error)
    } finally {
        if (optionsRequest === request) loadingOptions.value = false
    }
}

async function loadCurrent() {
    currentRequest?.abort()
    current.value = undefined
    currentError.value = ''
    loadingCurrent.value = false
    if (!props.track) return
    const request = new AbortController()
    currentRequest = request
    loadingCurrent.value = true
    try {
        const result = await getCurrentRecord(props.track.id, request.signal)
        if (!request.signal.aborted) current.value = result.current
    } catch (error) {
        if (!request.signal.aborted) currentError.value = apiErrorMessage(error)
    } finally {
        if (currentRequest === request) loadingCurrent.value = false
    }
}

function setDriverTeam(driverId: number) {
    if (!props.record) fields.teamId = options.value?.drivers.find(driver => driver.id === driverId)?.teamId ?? null
}

function isFutureDate(date: Date) {
    return calendarDate.format(date) > beijingDate.format()
}

function newRecordFacts() {
    const trackId = selectedTrack.value?.id
    if (trackId === undefined) throw new Error('请选择赛道')
    const parts = /^(\d{1,2}):([0-5]\d)\.(\d{2})$/.exec(fields.time.trim())
    if (!parts) throw new Error('请输入保留两位秒小数的成绩，例如 1:23.48')
    const timeMs = Number(parts[1]) * 60000 + Number(parts[2]) * 1000 + Number(parts[3]) * 10
    if (!timeMs) throw new Error('成绩必须大于 0')
    const { achievedAt } = fields
    if (!achievedAt) throw new Error('请选择达成日期')
    if (achievedAt > beijingDate.format()) throw new Error('达成日期不能晚于今天')
    return { trackId, timeMs, achievedAt }
}

async function submit() {
    if (saving.value || loadingOptions.value || !options.value || (!props.record && !selectedTrack.value) || screenshotError.value) return
    saveError.value = ''
    if (!fields.driverId) {
        saveError.value = '请选择车手'
        return
    }
    const metadata: RecordMetadata = {
        driverId: fields.driverId, teamId: fields.teamId, carId: fields.carId, petId: fields.petId,
        ecu: fields.ecu.map(name => name.trim()).filter(Boolean), videoUrl: videoUrl.value.trim() || null,
        note: note.value.trim() || null,
    }
    if (metadata.ecu.some(name => name.length > 100)) {
        saveError.value = '每项 ECU 名称最多 100 字'
        return
    }
    let facts: ReturnType<typeof newRecordFacts> | undefined
    if (!props.record) {
        try {
            facts = newRecordFacts()
        } catch (error) {
            saveError.value = error instanceof Error ? error.message : '请检查成绩与达成日期'
            return
        }
    }

    const request = new AbortController()
    saveRequest = request
    saving.value = true
    try {
        if (screenshot.value && !screenshotTicket) {
            uploading.value = true
            screenshotTicket = await uploadRecordScreenshot(screenshot.value, request.signal)
            request.signal.throwIfAborted()
            uploading.value = false
        }
        metadata.screenshotUploadTicket = screenshotTicket ?? (removeScreenshot.value ? null : undefined)
        const result = facts
            ? await createRecord({ ...metadata, ...facts }, props.track ? 'next' : 'first', request.signal)
            : await updateRecord(props.record!.id, metadata, request.signal)
        if (!request.signal.aborted) emit('saved', result.record)
    } catch (error) {
        if (request.signal.aborted) return
        if (error instanceof ApiError && ['INVALID_UPLOAD_TICKET', 'UPLOAD_EXPIRED', 'UPLOAD_NOT_FOUND'].includes(error.code)) {
            screenshotTicket = undefined
        }
        if (error instanceof ApiError && error.code === 'RECORD_NOT_FASTER') void loadCurrent()
        if (error instanceof ApiError && error.code === 'TRACK_ALREADY_HAS_RECORDS') {
            fields.trackId = null
            void loadOptions()
            emit('tracksChanged')
        }
        saveError.value = apiErrorMessage(error)
    } finally {
        saving.value = false
        uploading.value = false
        saveRequest = undefined
    }
}

watch(screenshot, () => { screenshotTicket = undefined })
onMounted(() => {
    void loadOptions()
    void loadCurrent()
})
onBeforeUnmount(() => {
    optionsRequest?.abort()
    currentRequest?.abort()
    saveRequest?.abort()
})
</script>

<template>
    <el-form class="record-editor" label-position="top" :disabled="saving" @submit.prevent="submit">
        <div v-if="optionsError" class="record-editor__notice" role="alert">
            <p>{{ optionsError }}</p>
            <el-button link type="primary" @click="loadOptions">重新加载录入选项</el-button>
        </div>
        <div v-loading="loadingOptions" class="record-editor__fields" :aria-busy="loadingOptions">
            <el-form-item v-if="!record && !track" label="赛道" required>
                <el-select v-model="fields.trackId" placeholder="搜索或选择赛道" filterable :disabled="!options"
                    no-data-text="暂无可首次录入的赛道">
                    <el-option v-for="option in options?.tracks" :key="option.id" :label="option.name" :value="option.id" />
                </el-select>
            </el-form-item>
            <template v-if="!record && selectedTrack">
                <div class="record-editor__current">
                    <RecordImagePreview :src="selectedTrack.coverUrl" :track-name="selectedTrack.name" label="赛道封面"
                        @preview="emit('previewTrackCover', $event)" />
                    <div class="record-editor__current-status" aria-live="polite">
                        <strong v-if="track" class="record-editor__track-name">{{ selectedTrack.name }}</strong>
                        <span v-if="!track">首次录入</span>
                        <span v-else-if="loadingCurrent">正在查询当前纪录…</span>
                        <template v-else-if="currentError">
                            <span>{{ currentError }}</span>
                            <el-button link type="primary" @click="loadCurrent">重试</el-button>
                        </template>
                        <span v-else-if="current">当前纪录 · <strong>{{ formatRecordTime(current.timeMs) }}</strong> · {{ current.driverName }}</span>
                        <span v-else>该赛道暂无纪录</span>
                    </div>
                </div>
                <el-form-item label="成绩" required>
                    <el-input v-model="fields.time" placeholder="例如 1:23.48" maxlength="8" />
                </el-form-item>
                <el-form-item label="达成日期" :for="achievedFieldId" required>
                    <ElDatePicker
                        :id="achievedFieldId"
                        v-model="fields.achievedAt"
                        class="record-editor__date"
                        type="date"
                        value-format="YYYY-MM-DD"
                        placeholder="选择达成日期"
                        :editable="false"
                        value-on-clear=""
                        :disabled-date="isFutureDate"
                    />
                </el-form-item>
            </template>
            <dl v-else-if="record" class="record-editor__summary">
                <div><dt>赛道</dt><dd>{{ record.trackName }}</dd></div>
                <div><dt>成绩</dt><dd>{{ formatRecordTime(record.timeMs) }}</dd></div>
                <div><dt>达成日期</dt><dd>{{ record.achievedAt }}</dd></div>
            </dl>
            <template v-if="record || selectedTrack">
                <el-form-item label="车手" required>
                    <el-select v-model="fields.driverId" filterable placeholder="搜索或选择车手" :disabled="!options" @change="setDriverTeam">
                        <el-option v-for="driver in drivers" :key="driver.id" :label="driver.name" :value="driver.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="车队">
                    <el-select v-model="fields.teamId" filterable clearable :value-on-clear="null" placeholder="搜索或选择车队" :disabled="!options">
                        <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="赛车">
                    <el-select v-model="fields.carId" filterable clearable :value-on-clear="null" placeholder="搜索或选择赛车" :disabled="!options"
                        @change="fields.ecu = []">
                        <el-option v-for="car in cars" :key="car.id" :label="car.name" :value="car.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="宠物">
                    <el-select v-model="fields.petId" filterable clearable :value-on-clear="null" placeholder="搜索或选择宠物" :disabled="!options">
                        <el-option v-for="pet in pets" :key="pet.id" :label="pet.name" :value="pet.id" />
                    </el-select>
                </el-form-item>
                <el-form-item class="record-editor__wide" label="ECU">
                    <el-select v-model="fields.ecu" multiple filterable allow-create default-first-option
                        placeholder="选择配置，或输入名称后按回车">
                        <el-option v-for="name in ecuOptions" :key="name" :label="name" :value="name" />
                    </el-select>
                </el-form-item>
                <el-form-item class="record-editor__wide" label="成绩截图">
                    <DataImageField v-model="screenshot" v-model:error="screenshotError" label="成绩截图" :disabled="saving"
                        :existing-url="removeScreenshot ? null : record?.screenshotUrl" />
                    <el-button v-if="record?.screenshotFileId && !screenshot" link :type="removeScreenshot ? 'primary' : 'danger'"
                        @click="removeScreenshot = !removeScreenshot">
                        {{ removeScreenshot ? '保留原截图' : '移除原截图' }}
                    </el-button>
                </el-form-item>
                <el-form-item class="record-editor__wide" label="视频地址">
                    <el-input v-model="videoUrl" placeholder="https://" maxlength="500" />
                </el-form-item>
                <el-form-item class="record-editor__wide" label="备注">
                    <el-input v-model="note" type="textarea" :rows="3" :maxlength="500" />
                </el-form-item>
            </template>
        </div>
        <p v-if="saveError" class="record-editor__error" role="alert">{{ saveError }}</p>
        <div class="record-editor__actions">
            <el-button :disabled="saving" @click="emit('cancel')">取消</el-button>
            <el-button v-if="record || selectedTrack" type="primary" native-type="submit" :loading="saving"
                :disabled="loadingOptions || !options || !!screenshotError">
                {{ uploading ? '上传截图中' : record ? '保存资料' : '提交成绩' }}
            </el-button>
        </div>
    </el-form>
</template>

<style scoped lang="scss">
.record-editor {
    display: grid;
    gap: 16px;
    min-width: 0;

    .record-editor__fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 205px), 1fr));
        gap: 16px;

        :deep(.el-form-item) {
            min-width: 0;
            margin-bottom: 0;
        }

        :deep(.record-editor__date) {
            --el-date-editor-width: 100%;
        }

        .record-editor__wide,
        .record-editor__summary,
        .record-editor__current {
            grid-column: 1 / -1;
        }

        .record-editor__summary {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 28px;
            padding: 12px 0;
            margin: 0;
            border-bottom: 1px solid var(--tk-color-border);

            dt {
                color: var(--tk-color-text-secondary);
            }

            dd {
                margin: 4px 0 0;
                font-variant-numeric: tabular-nums;
            }
        }

        .record-editor__current {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border-radius: var(--tk-radius-base);
            background: var(--el-fill-color-light);
            font-variant-numeric: tabular-nums;

            .record-editor__current-status {
                flex: 1 1 140px;
                min-width: 0;
                overflow-wrap: anywhere;

                .record-editor__track-name {
                    display: block;
                    margin-bottom: 4px;
                }
            }
        }
    }

    .record-editor__notice,
    .record-editor__error {
        margin: 0;
        color: var(--tk-color-error);
        overflow-wrap: anywhere;
    }

    .record-editor__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;

        .el-button + .el-button {
            margin-inline-start: 0;
        }
    }
}
</style>
