<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, apiErrorMessage, getTrackRecord } from '@/api'
import defaultTrackUrl from '@/assets/record-board/default-track.svg?url'
import { usePublicQuery } from '@/composables/use-public-query'
import { Icon } from '@/icons'
import FallbackImage from './components/FallbackImage.vue'
import { formatHoldingTime, formatRecordDateTime, formatRecordTime, voidReasonLabels } from './record-display'

const route = useRoute()
const trackId = computed(() => {
    const id = route.params.id
    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) return null
    const number = Number(id)
    return Number.isSafeInteger(number) ? number : null
})
const { data, error, loading, retry } = usePublicQuery(trackId, (id, signal) => {
    if (id === null) throw new ApiError(404, 'TRACK_NOT_FOUND', '赛道不存在', 0)
    return getTrackRecord(id, signal)
})
const notFound = computed(() => error.value instanceof ApiError && error.value.status === 404)
</script>

<template>
    <section class="track-detail" aria-label="赛道详情">
        <RouterLink class="track-detail__back" :to="{ name: 'records', query: route.query }">
            <Icon icon="ep:arrow-left" aria-hidden="true" /> 返回记录榜
        </RouterLink>

        <p v-if="loading" class="track-detail__notice" role="status">正在加载赛道详情…</p>
        <div v-else-if="error" class="track-detail__notice">
            <p role="alert">{{ apiErrorMessage(error) }}</p>
            <button v-if="!notFound" type="button" @click="retry">重新加载</button>
        </div>
        <template v-else-if="data">
            <header class="track-detail__header">
                <FallbackImage class="track-detail__cover" :src="data.track.coverUrl" :fallback="defaultTrackUrl" alt="" />
                <div class="track-detail__heading">
                    <h1>{{ data.track.name }}</h1>
                    <div v-if="data.track.stars || data.track.status === 'archived'" class="track-detail__tags">
                        <span v-if="data.track.stars">{{ data.track.stars }} 星</span>
                        <span v-if="data.track.status === 'archived'">已归档</span>
                    </div>
                </div>
            </header>

            <section class="track-detail__current" aria-labelledby="track-current-title">
                <div class="track-detail__result">
                    <h2 id="track-current-title">当前国服记录</h2>
                    <template v-if="data.current">
                        <p class="track-detail__time">{{ formatRecordTime(data.current.timeMs) }}</p>
                        <p class="track-detail__driver">
                            {{ data.current.driver.name }} <span>{{ data.current.team?.name ?? '独立车手' }}</span>
                        </p>
                        <dl class="track-detail__facts">
                            <div><dt>达成日期</dt><dd><time :datetime="data.current.achievedAt">{{ data.current.achievedAt }}</time></dd></div>
                            <div><dt>{{ data.current.kind === 'restore' ? '恢复时间' : '上榜时间' }}</dt><dd><time :datetime="data.current.effectiveAt">{{ formatRecordDateTime(data.current.effectiveAt) }}</time></dd></div>
                            <div v-if="data.current.car"><dt>赛车</dt><dd>{{ data.current.car.name }}</dd></div>
                            <div v-if="data.current.pet"><dt>宠物</dt><dd>{{ data.current.pet.name }}</dd></div>
                        </dl>
                        <a v-if="data.current.videoUrl" class="track-detail__media" :href="data.current.videoUrl" target="_blank" rel="noopener noreferrer">
                            <Icon icon="ep:video-camera" aria-hidden="true" /> 观看视频
                        </a>
                    </template>
                    <p v-else class="track-detail__muted">暂无国服记录</p>
                </div>
                <a v-if="data.current?.screenshotUrl" class="track-detail__screenshot" :href="data.current.screenshotUrl" target="_blank" rel="noopener noreferrer">
                    <img :src="data.current.screenshotUrl" alt="当前国服成绩截图" decoding="async" />
                    <span>查看原图</span>
                </a>
            </section>

            <dl class="track-detail__stats" aria-label="赛道记录统计">
                <div><dt>收录成绩</dt><dd>{{ data.stats.historicalRecordCount }} 条</dd></div>
                <div><dt>被打破</dt><dd>{{ data.stats.brokenCount }} 次</dd></div>
                <div><dt>当前保持</dt><dd>{{ data.current ? formatHoldingTime(data.stats.currentHoldingMs) : '—' }}</dd></div>
                <div><dt>最长有效保持</dt><dd>{{ data.current ? formatHoldingTime(data.stats.longestHoldingMs) : '—' }}</dd></div>
            </dl>

            <section class="track-detail__history" aria-labelledby="track-history-title">
                <h2 id="track-history-title">纪录沿革</h2>
                <ol v-if="data.history.length">
                    <li v-for="version in data.history" :key="version.versionId" class="track-detail__version">
                        <header class="track-detail__version-header">
                            <span>{{ version.kind === 'restore' ? '恢复' : '上榜' }}</span>
                            <strong class="track-detail__version-time" :class="{ 'is-voided': version.state === 'voided' }">{{ formatRecordTime(version.timeMs) }}</strong>
                            <span>{{ version.driver.name }}{{ version.team ? ` · ${version.team.name}` : '' }}</span>
                            <span v-if="version.state === 'current'" class="track-detail__version-state">当前纪录</span>
                            <span v-else-if="version.state === 'voided'" class="track-detail__version-state is-voided">
                                已作废{{ version.voidReason ? ` · ${voidReasonLabels[version.voidReason]}` : '' }}
                            </span>
                        </header>
                        <dl class="track-detail__facts">
                            <div><dt>达成</dt><dd><time :datetime="version.achievedAt">{{ version.achievedAt }}</time></dd></div>
                            <div><dt>生效</dt><dd><time :datetime="version.effectiveAt">{{ formatRecordDateTime(version.effectiveAt) }}</time></dd></div>
                            <div><dt>结束</dt><dd><time v-if="version.endedAt" :datetime="version.endedAt">{{ formatRecordDateTime(version.endedAt) }}</time><span v-else>持续至今</span></dd></div>
                            <div><dt>保持</dt><dd>{{ formatHoldingTime(version.holdingMs) }}</dd></div>
                        </dl>
                    </li>
                </ol>
                <p v-else class="track-detail__muted">暂无历史纪录</p>
            </section>
        </template>
    </section>
</template>

<style scoped lang="scss">
.track-detail {
    display: grid;
    gap: 24px;
    padding-block: 28px 56px;
    font-variant-numeric: tabular-nums;

    a,
    button {
        &:focus-visible {
            outline: 2px solid var(--tk-color-primary);
            outline-offset: 3px;
        }
    }

    h1,
    h2 {
        margin: 0;
        overflow-wrap: anywhere;
        line-height: 1.2;
    }

    .track-detail__back,
    .track-detail__media {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 6px;
        color: var(--tk-color-primary);
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }

    .track-detail__notice {
        margin: 0;
        padding: 40px 16px;
        border: 1px solid var(--tk-color-border);
        color: var(--tk-color-text-secondary);
        text-align: center;

        button {
            padding: 6px 16px;
            border: 1px solid var(--tk-color-primary);
            color: var(--tk-color-primary);
            background: transparent;
            cursor: pointer;

            &:hover {
                background: color-mix(in srgb, var(--tk-color-primary) 10%, transparent);
            }
        }
    }

    .track-detail__header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--tk-color-border);

        .track-detail__cover {
            width: min(28%, 160px);
            aspect-ratio: 3 / 2;
            border-radius: var(--tk-radius-avatar);
            object-fit: cover;
        }

        .track-detail__heading {
            min-width: 0;

            h1 {
                font-size: clamp(26px, 5vw, 42px);
            }

            .track-detail__tags {
                display: flex;
                gap: 12px;
                margin-top: 8px;
                color: var(--tk-color-text-secondary);
            }
        }
    }

    .track-detail__current {
        display: flex;
        flex-wrap: wrap;
        align-items: start;
        justify-content: space-between;
        gap: 24px;

        .track-detail__result {
            flex: 1 1 290px;
            min-width: 0;

            .track-detail__time {
                margin: 8px 0 0;
                color: var(--tk-color-primary);
                font-family: var(--tk-font-family-numeric);
                font-size: 48px;
                font-weight: 700;
                line-height: 1.05;
            }

            .track-detail__driver {
                margin-block: 8px 12px;
                font-size: 20px;
                overflow-wrap: anywhere;

                span {
                    margin-inline-start: 8px;
                    color: var(--tk-color-text-secondary);
                    font-size: 15px;
                }
            }

            .track-detail__media {
                margin-top: 12px;
            }
        }

        .track-detail__screenshot {
            display: grid;
            flex: 0 1 340px;
            gap: 6px;
            color: var(--tk-color-primary);
            text-underline-offset: 3px;

            img {
                width: 100%;
                aspect-ratio: 16 / 9;
                border: 1px solid var(--tk-color-border);
                object-fit: contain;
            }
        }
    }

    .track-detail__stats,
    .track-detail__facts {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 24px;
        margin: 0;

        div {
            min-width: 0;
            overflow-wrap: anywhere;

            dt {
                margin-bottom: 4px;
                color: var(--tk-color-text-secondary);
                font-size: 14px;
            }

            dd {
                margin: 0;
            }
        }
    }

    .track-detail__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(122px, 1fr));
        padding-block: 16px;
        border-block: 1px solid var(--tk-color-border);
    }

    .track-detail__history {
        ol {
            margin: 12px 0 0;
            padding: 0;
            list-style: none;

            .track-detail__version {
                display: grid;
                gap: 8px;
                padding-block: 14px;
                border-bottom: 1px solid var(--tk-color-border);

                .track-detail__version-header {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 4px 12px;
                    overflow-wrap: anywhere;

                    .track-detail__version-time {
                        font-family: var(--tk-font-family-numeric);
                        font-size: 24px;

                        &.is-voided {
                            color: var(--tk-color-text-secondary);
                            text-decoration: line-through;
                        }
                    }

                    .track-detail__version-state {
                        color: var(--tk-color-primary);

                        &.is-voided {
                            color: var(--tk-color-rank-bronze);
                        }
                    }
                }
            }
        }
    }

    .track-detail__muted {
        color: var(--tk-color-text-secondary);
    }
}
</style>
