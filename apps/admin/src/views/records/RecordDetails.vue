<script setup lang="ts">
import type { RecordDetail } from '@/api'
import { formatRecordDate, formatRecordTime, recordStateLabels, recordVoidReasonLabels } from './record-display'
import RecordImagePreview from './RecordImagePreview.vue'

defineProps<{ record: RecordDetail }>()
const emit = defineEmits<{ preview: [src: string] }>()
</script>

<template>
    <div class="record-details">
        <dl class="record-details__fields">
            <div><dt>成绩</dt><dd>{{ formatRecordTime(record.timeMs) }}</dd></div>
            <div><dt>状态</dt><dd>{{ recordStateLabels[record.state] }}</dd></div>
            <div><dt>车手</dt><dd>{{ record.driverName }}</dd></div>
            <div><dt>车队</dt><dd>{{ record.teamName || '—' }}</dd></div>
            <div><dt>赛车</dt><dd>{{ record.carName || '—' }}</dd></div>
            <div><dt>宠物</dt><dd>{{ record.petName || '—' }}</dd></div>
            <div class="record-details__wide"><dt>ECU</dt><dd>{{ record.ecu.join('、') || '—' }}</dd></div>
            <div><dt>达成日期</dt><dd>{{ record.achievedAt }}</dd></div>
            <div><dt>录入时间</dt><dd>{{ formatRecordDate(record.createdAt) }} · {{ record.createdByName || '—' }}</dd></div>
            <div>
                <dt>成绩截图</dt>
                <dd>
                    <RecordImagePreview :src="record.screenshotUrl" :track-name="record.trackName" label="成绩截图"
                        @preview="emit('preview', $event)" />
                </dd>
            </div>
            <div>
                <dt>视频</dt>
                <dd><a v-if="record.videoUrl" :href="record.videoUrl" target="_blank" rel="noopener noreferrer">打开成绩视频</a><span v-else>—</span></dd>
            </div>
            <div v-if="record.note" class="record-details__wide"><dt>备注</dt><dd>{{ record.note }}</dd></div>
        </dl>

        <section v-if="record.voidReason" class="record-details__section">
            <h3>作废信息</h3>
            <p>{{ recordVoidReasonLabels[record.voidReason] }} · {{ formatRecordDate(record.voidedAt) }} · {{ record.voidedByName || '—' }}</p>
            <p v-if="record.voidNote">{{ record.voidNote }}</p>
        </section>
        <section v-if="record.versions.length" class="record-details__section">
            <h3>上榜历史</h3>
            <ul>
                <li v-for="version in record.versions" :key="version.id">
                    {{ version.kind === 'set' ? '上榜' : '恢复' }} · {{ formatRecordDate(version.effectiveAt) }} · {{ version.operatorName || '—' }}
                </li>
            </ul>
        </section>
    </div>
</template>

<style scoped lang="scss">
.record-details {
    display: grid;
    gap: 20px;
    overflow-wrap: anywhere;

    .record-details__fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 175px), 1fr));
        gap: 12px 20px;
        margin: 0;

        .record-details__wide {
            grid-column: 1 / -1;
        }

        dt {
            color: var(--tk-color-text-secondary);
        }

        dd {
            margin: 4px 0 0;
            white-space: pre-wrap;
            font-variant-numeric: tabular-nums;

            a {
                color: var(--tk-color-primary);
                text-decoration: underline;
                text-underline-offset: 2px;
            }
        }
    }

    .record-details__section {
        padding-top: 12px;
        border-top: 1px solid var(--tk-color-border);

        h3 {
            margin: 0 0 8px;
            font-size: 16px;
            color: var(--tk-color-text-primary);
        }

        p,
        ul {
            margin: 0;
            line-height: 1.7;
        }

        ul {
            padding-inline-start: 20px;
        }
    }
}
</style>
