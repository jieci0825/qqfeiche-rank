<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { ApiError, apiErrorMessage, previewRecordVoid, voidRecord, type RecordItem, type RecordVoidImpact, type RecordVoidReason } from '@/api'
import { formatRecordTime, recordVoidReasonLabels } from './record-display'

const props = defineProps<{ record: RecordItem }>()
const emit = defineEmits<{ closed: []; saved: [] }>()
const open = ref(true)
const impact = shallowRef<RecordVoidImpact>()
const reason = ref<RecordVoidReason>()
const note = ref('')
const previewError = ref('')
const saveError = ref('')
const loading = ref(false)
const saving = ref(false)
const alreadyVoided = ref(false)
let previewRequest: AbortController | undefined
let saveRequest: AbortController | undefined

async function loadImpact() {
    previewRequest?.abort()
    const request = new AbortController()
    previewRequest = request
    impact.value = undefined
    previewError.value = ''
    loading.value = true
    try {
        const result = await previewRecordVoid(props.record.id, request.signal)
        if (!request.signal.aborted) impact.value = result
    } catch (error) {
        if (!request.signal.aborted) {
            alreadyVoided.value = error instanceof ApiError && error.code === 'RECORD_VOIDED'
            previewError.value = apiErrorMessage(error)
        }
    } finally {
        if (previewRequest === request) loading.value = false
    }
}

async function submit() {
    if (saving.value || !impact.value || !reason.value) return
    if (reason.value === 'other' && !note.value.trim()) {
        saveError.value = '请填写作废说明'
        return
    }
    const request = new AbortController()
    saveRequest = request
    saveError.value = ''
    saving.value = true
    try {
        await voidRecord(props.record.id, reason.value, note.value, impact.value, request.signal)
        if (!request.signal.aborted) {
            open.value = false
            emit('saved')
        }
    } catch (error) {
        if (request.signal.aborted) return
        saveError.value = apiErrorMessage(error)
        if (error instanceof ApiError && ['RECORD_VOID_IMPACT_CHANGED', 'RECORD_VOIDED'].includes(error.code)) {
            await loadImpact()
        }
    } finally {
        saving.value = false
    }
}

onMounted(loadImpact)
onBeforeUnmount(() => {
    previewRequest?.abort()
    saveRequest?.abort()
})
</script>

<template>
    <el-dialog v-model="open" title="作废成绩" width="min(520px, calc(100% - 32px))"
        :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving" @closed="emit('closed')">
        <el-form class="record-void" label-position="top" :disabled="saving" @submit.prevent="submit">
            <p class="record-void__summary">
                {{ record.trackName }} · {{ record.driverName }} · <strong>{{ formatRecordTime(record.timeMs) }}</strong>
            </p>
            <div class="record-void__impact" aria-live="polite" :aria-busy="loading">
                <p v-if="loading">正在检查作废影响…</p>
                <template v-else-if="previewError">
                    <p role="alert">{{ previewError }}</p>
                    <el-button v-if="!alreadyVoided" link type="primary" @click="loadImpact">重试</el-button>
                </template>
                <p v-else-if="impact?.recovery">
                    作废后将恢复 {{ impact.recovery.driverName }}的 <strong>{{ formatRecordTime(impact.recovery.timeMs) }}</strong>。
                </p>
                <p v-else-if="impact?.effect === 'empty'">作废后该赛道将暂无当前纪录。</p>
                <p v-else-if="impact?.effect === 'unchanged'">作废后当前纪录保持原样。</p>
            </div>
            <el-form-item label="作废原因" required>
                <el-select v-model="reason" placeholder="请选择作废原因">
                    <el-option v-for="(label, value) in recordVoidReasonLabels" :key="value" :label="label" :value="value" />
                </el-select>
            </el-form-item>
            <el-form-item label="作废说明" :required="reason === 'other'">
                <el-input v-model="note" type="textarea" :rows="3" :maxlength="500" />
            </el-form-item>
            <p v-if="saveError && !alreadyVoided" class="record-void__error" role="alert">{{ saveError }}</p>
            <div class="record-void__actions">
                <el-button :disabled="saving" @click="open = false">取消</el-button>
                <el-button type="danger" native-type="submit" :loading="saving" :disabled="!impact || !reason">确认作废</el-button>
            </div>
        </el-form>
    </el-dialog>
</template>

<style scoped lang="scss">
.record-void {
    display: grid;
    gap: 16px;

    :deep(.el-form-item) {
        margin-bottom: 0;
    }

    .record-void__summary,
    .record-void__error {
        margin: 0;
        overflow-wrap: anywhere;
    }

    .record-void__impact {
        padding: 8px 12px;
        border-radius: var(--tk-radius-base);
        background: var(--el-fill-color-light);
        overflow-wrap: anywhere;

        p {
            margin: 0;
        }
    }

    .record-void__error {
        color: var(--tk-color-error);
    }

    .record-void__actions {
        display: flex;
        justify-content: flex-end;
    }
}
</style>
