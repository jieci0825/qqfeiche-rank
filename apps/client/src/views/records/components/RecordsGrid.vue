<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@/icons'
import { tracks, type Track } from '@/data/tracks'
import type { RecordsFilterValue } from './RecordsFilter.vue'

type SceneKey = 'ranked' | 'peak' | 'league' | 'other'
type DistanceKey = 'short' | 'medium' | 'long'

interface RecordCard {
    track: Track
    cover: string
    record: string
    driver: string
    team: string | null
    achievedAt: string
    held: string
    distance: DistanceKey
    scene: SceneKey
}

const props = withDefaults(
    defineProps<{
        keyword?: string
        filter?: RecordsFilterValue
    }>(),
    {
        keyword: '',
        filter: () => ({ stars: [], scenes: [], distances: [] }),
    }
)

const RECORD_TIME = '1.00.08'
const BASE_DATE = Date.UTC(2026, 10, 13)
const DAY_MS = 24 * 60 * 60 * 1000
const DRIVERS = [
    { name: '云海', team: 'RSG' },
    { name: '小钰', team: 'Q9' },
    { name: '阿布', team: 'eStar' },
    { name: '冷风', team: 'AG' },
    { name: '南栀', team: '狼队' },
    { name: '白夜', team: 'GK' },
    { name: '北冥', team: 'TYT' },
    { name: '星野', team: '巅峰战队' },
    { name: '疾影', team: null },
    { name: '青柠', team: 'RSG' },
    { name: '无痕', team: 'Q9' },
    { name: '风影', team: 'eStar' },
]
const SCENE_LABELS: Record<SceneKey, string> = {
    ranked: '排位',
    peak: '巅峰',
    league: '联赛',
    other: '其他',
}
const SCENE_KEYS: SceneKey[] = ['ranked', 'peak', 'league']
const DISTANCE_LABELS: Record<DistanceKey, string> = {
    short: '短图',
    medium: '中图',
    long: '长图',
}

function getDistance(track: Track): DistanceKey {
    if (track.tags.includes('短图')) {
        return 'short'
    }

    if (track.tags.includes('长图')) {
        return 'long'
    }

    return 'medium'
}

// 正式接口接入前，按赛道名稳定生成场景，保证筛选结果不会随渲染变化。
function getScene(track: Track): SceneKey {
    const seed = [...track.name].reduce(
        (total, char) => total + char.charCodeAt(0),
        0
    )

    return SCENE_KEYS[seed % SCENE_KEYS.length]
}

function formatDate(timestamp: number) {
    const date = new Date(timestamp)

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatHeld(days: number) {
    if (days < 30) {
        return `${days} 天`
    }

    const months = Math.floor(days / 30)

    if (months < 12) {
        return `${months} 个月`
    }

    const years = Math.floor(months / 12)
    const restMonths = months % 12

    return restMonths > 0 ? `${years} 年 ${restMonths} 个月` : `${years} 年`
}

const records = computed<RecordCard[]>(() =>
    tracks.map((track, index) => {
        const driver = DRIVERS[index % DRIVERS.length]
        const daysAgo = 3 + ((index * 37) % 340)

        return {
            track,
            cover: track.image ?? track.cover ?? '',
            record: RECORD_TIME,
            driver: driver.name,
            team: driver.team,
            achievedAt: formatDate(BASE_DATE - daysAgo * DAY_MS),
            held: formatHeld(daysAgo),
            distance: getDistance(track),
            scene: getScene(track),
        }
    })
)

const visibleRecords = computed(() => {
    const keyword = props.keyword.trim().toLowerCase()
    const { stars, scenes, distances } = props.filter

    return records.value.filter(item => {
        if (stars.length > 0 && !stars.includes(item.track.stars)) {
            return false
        }

        if (scenes.length > 0 && !scenes.includes(item.scene)) {
            return false
        }

        if (distances.length > 0 && !distances.includes(item.distance)) {
            return false
        }

        if (!keyword) {
            return true
        }

        return [item.track.name, item.driver, item.team ?? '独立车手'].some(
            value => value.toLowerCase().includes(keyword)
        )
    })
})

const failedCovers = ref(new Set<string>())

function markCoverFailed(name: string) {
    failedCovers.value = new Set(failedCovers.value).add(name)
}
</script>

<template>
    <div class="records-grid">
        <article
            v-for="item in visibleRecords"
            :key="item.track.name"
            class="record-card"
        >
            <div class="record-card__cover">
                <img
                    v-if="item.cover && !failedCovers.has(item.track.name)"
                    class="record-card__cover-image"
                    :src="item.cover"
                    :alt="`${item.track.name}赛道预览图`"
                    loading="lazy"
                    @error="markCoverFailed(item.track.name)"
                />

                <div
                    v-else
                    class="record-card__cover-fallback"
                >
                    <Icon
                        icon="ep:map-location"
                        aria-hidden="true"
                    />
                    <span>暂无预览</span>
                </div>
            </div>

            <div class="record-card__content">
                <div class="record-card__head">
                    <div class="record-card__intro">
                        <h3
                            class="record-card__name"
                            :title="item.track.name"
                        >
                            {{ item.track.name }}
                        </h3>

                        <ul
                            class="record-card__tags"
                            aria-label="赛道标记"
                        >
                            <li>
                                <el-tag
                                    class="record-card__tag"
                                    type="primary"
                                    effect="plain"
                                    size="small"
                                    :title="`地图星级：${item.track.stars} 星`"
                                >
                                    {{ item.track.stars }}星
                                </el-tag>
                            </li>
                            <li>
                                <el-tag
                                    class="record-card__tag"
                                    type="primary"
                                    effect="plain"
                                    size="small"
                                    :title="`地图场景：${SCENE_LABELS[item.scene]}`"
                                >
                                    {{ SCENE_LABELS[item.scene] }}
                                </el-tag>
                            </li>
                            <li>
                                <el-tag
                                    class="record-card__tag"
                                    type="primary"
                                    effect="plain"
                                    size="small"
                                    :title="`地图距离：${DISTANCE_LABELS[item.distance]}`"
                                >
                                    {{ DISTANCE_LABELS[item.distance] }}
                                </el-tag>
                            </li>
                        </ul>
                    </div>

                    <div
                        class="record-card__record"
                        :aria-label="`国服记录 ${item.record}`"
                    >
                        <strong class="record-card__record-value">
                            {{ item.record }}
                        </strong>
                    </div>
                </div>

                <dl class="record-card__meta">
                    <div class="record-card__meta-item">
                        <dt class="record-card__meta-label">
                            <Icon
                                icon="ep:user"
                                aria-hidden="true"
                            />
                            车手
                        </dt>
                        <dd
                            class="record-card__meta-value"
                            :title="item.driver"
                        >
                            {{ item.driver }}
                        </dd>
                    </div>

                    <div class="record-card__meta-item">
                        <dt class="record-card__meta-label">
                            <Icon
                                icon="ep:flag"
                                aria-hidden="true"
                            />
                            车队
                        </dt>
                        <dd
                            class="record-card__meta-value"
                            :title="item.team ?? '独立车手'"
                        >
                            {{ item.team ?? '独立车手' }}
                        </dd>
                    </div>

                    <div class="record-card__meta-item">
                        <dt class="record-card__meta-label">
                            <Icon
                                icon="ep:calendar"
                                aria-hidden="true"
                            />
                            达成
                        </dt>
                        <dd
                            class="record-card__meta-value"
                            :title="`达成时间：${item.achievedAt}`"
                        >
                            {{ item.achievedAt }}
                        </dd>
                    </div>

                    <div class="record-card__meta-item">
                        <dt class="record-card__meta-label">
                            <Icon
                                icon="ep:timer"
                                aria-hidden="true"
                            />
                            保持
                        </dt>
                        <dd
                            class="record-card__meta-value"
                            :title="`保持时长：${item.held}`"
                        >
                            {{ item.held }}
                        </dd>
                    </div>
                </dl>
            </div>
        </article>

        <div
            v-if="visibleRecords.length === 0"
            class="records-grid__empty"
            role="status"
        >
            <Icon
                icon="ep:search"
                aria-hidden="true"
            />
            <p class="records-grid__empty-title">没有匹配的赛道</p>
            <p class="records-grid__empty-desc">
                换个关键词，或调整右侧的筛选条件
            </p>
        </div>
    </div>
</template>

<style scoped lang="scss">
$record-font:
    'Chakra Petch', 'DIN Alternate', 'DIN Condensed', 'Bahnschrift',
    'Arial Narrow', sans-serif;

.records-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
    gap: 20px;
    align-content: start;

    .record-card {
        display: flex;
        min-width: 0;
        min-height: 128px;
        border: 1px solid var(--tk-color-border);
        border-radius: var(--radius-large);
        background: var(--tk-color-bg-surface);
        transition: border-color 0.2s ease;
        cursor: pointer;

        &:hover {
            border-color: var(--tk-color-border-strong);
        }

        &:hover .record-card__cover-image {
            transform: scale(1.04);
        }

        .record-card__cover {
            position: relative;
            flex: 0 0 140px;
            align-self: stretch;
            overflow: hidden;
            border-radius: calc(var(--radius-large) - 1px) 0 0
                calc(var(--radius-large) - 1px);
            background: var(--tk-color-bg-page);

            .record-card__cover-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.35s ease;
            }

            .record-card__cover-fallback {
                display: flex;
                width: 100%;
                height: 100%;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: linear-gradient(
                    135deg,
                    var(--tk-color-bg-page),
                    var(--tk-color-bg-hover)
                );
                color: var(--tk-color-text-tertiary);
                font-size: 12px;

                svg {
                    width: 26px;
                    height: 26px;
                    color: var(--tk-color-text-disabled);
                }
            }
        }

        .record-card__content {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
            padding: 8px;
        }

        .record-card__head {
            display: flex;
            align-items: stretch;
            gap: 8px;
            min-width: 0;

            .record-card__intro {
                display: flex;
                flex: 1;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }

            .record-card__name {
                margin: 0;
                overflow: hidden;
                color: var(--tk-color-text-primary);
                font-size: 16px;
                font-weight: 700;
                line-height: 1.35;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .record-card__tags {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin: 0;
                padding: 0;
                list-style: none;

                .record-card__tag {
                    height: 21px;
                    padding: 0 6px;
                    border-radius: var(--radius-small);
                    font-size: 11px;
                }
            }

            .record-card__record {
                display: flex;
                flex: 0 0 auto;
                align-self: stretch;
                align-items: center;
                justify-content: flex-end;

                .record-card__record-value {
                    // color: var(--tk-color-text-primary);
                    color: var(--tk-color-warning);
                    font-family: $record-font;
                    font-size: 38px;
                    font-style: italic;
                    font-variant-numeric: tabular-nums;
                    font-weight: 700;
                    letter-spacing: 0.03em;
                    line-height: 1;
                    white-space: nowrap;
                }
            }
        }

        .record-card__meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 10px;
            margin: auto 0 0;
            padding-top: 8px;
            border-top: 1px solid var(--tk-color-border);

            .record-card__meta-item {
                display: flex;
                align-items: center;
                gap: 5px;
                min-width: 0;
            }

            .record-card__meta-label {
                display: inline-flex;
                flex-shrink: 0;
                align-items: center;
                gap: 3px;
                color: var(--tk-color-text-tertiary);
                font-size: 12px;

                svg {
                    width: 14px;
                    height: 14px;
                }
            }

            .record-card__meta-value {
                min-width: 0;
                margin: 0;
                overflow: hidden;
                color: var(--tk-color-text-secondary);
                font-size: 13px;
                font-variant-numeric: tabular-nums;
                font-weight: 500;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    .records-grid__empty {
        display: flex;
        flex-direction: column;
        grid-column: 1 / -1;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 72px 24px;
        border: 1px dashed var(--tk-color-border);
        border-radius: var(--radius-large);
        color: var(--tk-color-text-tertiary);
        text-align: center;

        svg {
            width: 36px;
            height: 36px;
            margin-bottom: 4px;
            color: var(--tk-color-text-disabled);
        }

        .records-grid__empty-title {
            margin: 0;
            color: var(--tk-color-text-primary);
            font-size: 15px;
            font-weight: 600;
        }

        .records-grid__empty-desc {
            margin: 0;
            font-size: 13px;
        }
    }

    @media (max-width: 520px) {
        .record-card {
            flex-direction: column;

            .record-card__cover {
                flex: 0 0 120px;
                width: 100%;
                border-radius: calc(var(--radius-large) - 1px)
                    calc(var(--radius-large) - 1px) 0 0;
            }

            .record-card__head {
                .record-card__record {
                    .record-card__record-value {
                        font-size: 30px;
                    }
                }
            }
        }
    }
}
</style>
