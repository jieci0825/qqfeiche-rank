<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@/icons'
import type { TrackRecord } from '@/data/records'
import defaultDriverUrl from '@/assets/record-board/default-driver.svg?url'
import defaultTeamUrl from '@/assets/record-board/default-team.svg?url'
import defaultTrackUrl from '@/assets/record-board/default-track.svg?url'
import daysBrushUrl from '@/assets/record-board/record-days-brush.png'
import FallbackImage from './FallbackImage.vue'

const holdingBrushStyle = { backgroundImage: `url("${daysBrushUrl}")` }

const props = defineProps<{
    record: TrackRecord
}>()
const lengthLabels = { short: '短图', medium: '中图', long: '长图' }
const formattedTime = computed(() => {
    const hundredths = Math.floor(props.record.timeMs / 10)
    const minutes = Math.floor(hundredths / 6000)
    const seconds = String(Math.floor(hundredths / 100) % 60).padStart(2, '0')
    return `${minutes}:${seconds}.${String(hundredths % 100).padStart(2, '0')}`
})
</script>

<template>
    <article
        class="record-card"
        :aria-label="`${record.track.name}记录`"
    >
        <div class="record-card__inner">
            <div class="record-card__track">
                <div class="record-card__image">
                    <FallbackImage
                        class="record-card__cover"
                        :src="record.track.image || record.track.cover"
                        :fallback="defaultTrackUrl"
                        :alt="`${record.track.name}赛道`"
                    />
                </div>
                <div class="record-card__track-info">
                    <h3
                        class="record-card__track-name"
                        :title="record.track.name"
                    >
                        {{ record.track.name }}
                    </h3>
                    <div class="record-card__tags">
                        <span class="record-card__tag"
                            >距离：{{ lengthLabels[record.length] }}</span
                        >
                        <span class="record-card__tag"
                            >场景：{{ record.raceMode }}</span
                        >
                        <span
                            class="record-card__tag"
                            :aria-label="`星级：${record.track.stars} 星`"
                        >
                            星级：
                            <span
                                class="record-card__stars"
                                aria-hidden="true"
                            >
                                <Icon
                                    v-for="star in record.track.stars"
                                    :key="star"
                                    icon="ep:star-filled"
                                />
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div class="record-card__driver">
                <FallbackImage
                    class="record-card__avatar"
                    :src="record.driver.avatar"
                    :fallback="defaultDriverUrl"
                    :alt="`${record.driver.name}的头像`"
                />
                <div class="record-card__driver-info">
                    <div class="record-card__driver-name">
                        <span :title="record.driver.name">{{
                            record.driver.name
                        }}</span>
                        <Icon
                            v-if="record.driver.isChampion"
                            class="record-card__honor"
                            icon="ep:trophy"
                            role="img"
                            aria-label="冠军车手"
                        />
                    </div>
                    <div class="record-card__team">
                        <FallbackImage
                            class="record-card__team-badge"
                            :src="record.team.badge"
                            :fallback="defaultTeamUrl"
                            alt=""
                        />
                        <span :title="record.team.name"
                            >车队：{{ record.team.name }}</span
                        >
                    </div>
                </div>
            </div>

            <div class="record-card__result">
                <span class="record-card__result-label">达成</span>
                <span class="record-card__time">{{ formattedTime }}</span>
            </div>

            <div class="record-card__status">
                <div
                    class="record-card__holding"
                    :style="holdingBrushStyle"
                >
                    <span>保持</span>
                    <strong>{{ record.holdingDays }}</strong>
                    <span>天</span>
                </div>
                <span class="record-card__updated">
                    更新：<time :datetime="record.updatedAt">{{
                        record.updatedAt
                    }}</time>
                </span>
            </div>
        </div>
    </article>
</template>

<style scoped lang="scss">
.record-card {
    --record-card-height: 82px;
    --record-card-cut: 10px;
    --record-card-inner-cut: calc(var(--record-card-cut) - 0.6px);
    --record-card-shape: polygon(
        var(--record-card-cut) 0,
        100% 0,
        100% calc(100% - var(--record-card-cut)),
        calc(100% - var(--record-card-cut)) 100%,
        0 100%,
        0 var(--record-card-cut)
    );

    position: relative;
    isolation: isolate;
    padding: 1px;
    background: linear-gradient(
        120deg,
        color-mix(in srgb, var(--tk-color-text-secondary) 56%, transparent),
        color-mix(in srgb, var(--tk-color-text-secondary) 20%, transparent) 42%,
        color-mix(in srgb, var(--tk-color-text-secondary) 34%, transparent) 74%,
        color-mix(in srgb, var(--tk-color-text-secondary) 68%, transparent)
    );
    clip-path: var(--record-card-shape);
    font-variant-numeric: lining-nums tabular-nums;

    &::before,
    &::after {
        position: absolute;
        z-index: 1;
        content: '';
        pointer-events: none;
    }

    &::before {
        top: 0;
        right: 0;
        width: 72px;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--tk-color-primary)
        );
    }

    &::after {
        top: 0;
        right: 0;
        width: 12px;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--tk-color-primary)
        );
        transform: rotate(-45deg);
        transform-origin: right center;
    }

    .record-card__inner {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 216px 168px 180px;
        align-items: center;
        min-height: var(--record-card-height);
        // 内外轮廓错开 1px，让斜切边也保持连续描边。
        background:
            linear-gradient(
                125deg,
                color-mix(in srgb, var(--tk-color-text) 3%, transparent),
                transparent 55%
            ),
            color-mix(in srgb, var(--tk-color-bg) 96%, var(--tk-color-text));
        clip-path: polygon(
            var(--record-card-inner-cut) 0,
            100% 0,
            100% calc(100% - var(--record-card-inner-cut)),
            calc(100% - var(--record-card-inner-cut)) 100%,
            0 100%,
            0 var(--record-card-inner-cut)
        );

        .record-card__track {
            display: flex;
            align-items: center;
            align-self: stretch;
            min-width: 0;

            .record-card__image {
                --record-card-image-mask: linear-gradient(
                    to right,
                    var(--tk-color-text) 30%,
                    color-mix(in srgb, var(--tk-color-text) 94%, transparent)
                        44%,
                    color-mix(in srgb, var(--tk-color-text) 65%, transparent)
                        62%,
                    color-mix(in srgb, var(--tk-color-text) 28%, transparent)
                        80%,
                    color-mix(in srgb, var(--tk-color-text) 6%, transparent) 92%,
                    transparent 100%
                );

                position: relative;
                flex: 0 0 44%;
                align-self: stretch;
                min-height: var(--record-card-height);
                // 后 70% 逐步淡出，直接透出卡片背景，延长过渡并消除图片右侧硬边。
                mask-image: var(--record-card-image-mask);
                mask-mode: alpha;
                mask-repeat: no-repeat;
                -webkit-mask-image: var(--record-card-image-mask);
                -webkit-mask-repeat: no-repeat;

                .record-card__cover {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
            }

            .record-card__track-info {
                flex: 1;
                min-width: 0;
                padding: 8px 16px 8px 4px;

                .record-card__track-name {
                    margin: 0 0 6px;
                    overflow: hidden;
                    color: var(--tk-color-text);
                    font-size: 28px;
                    font-weight: 700;
                    line-height: 1.25;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .record-card__tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;

                    .record-card__tag {
                        display: inline-flex;
                        align-items: center;
                        min-height: 20px;
                        padding: 1px 5px;
                        border: 1px solid
                            color-mix(
                                in srgb,
                                var(--tk-color-text-secondary) 48%,
                                transparent
                            );
                        border-radius: 3px;
                        color: var(--tk-color-text-secondary);
                        font-size: 12px;
                        line-height: 1.4;
                        white-space: nowrap;

                        .record-card__stars {
                            display: inline-flex;
                            color: var(--tk-color-primary);

                            svg {
                                width: 11px;
                                height: 11px;
                            }
                        }
                    }
                }
            }
        }

        .record-card__driver {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            min-height: 48px;
            padding-inline: 16px 12px;
            border-left: 1px solid var(--tk-color-border);

            .record-card__avatar {
                flex: 0 0 40px;
                width: 40px;
                height: 40px;
                border: 1px solid var(--tk-color-border);
                border-radius: 3px;
                object-fit: cover;
            }

            .record-card__driver-info {
                min-width: 0;

                .record-card__driver-name {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-bottom: 6px;
                    color: var(--tk-color-text);
                    font-size: 18px;
                    font-weight: 700;

                    span {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .record-card__honor {
                        flex: 0 0 14px;
                        width: 14px;
                        height: 14px;
                        color: var(--tk-color-primary);
                    }
                }

                .record-card__team {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: var(--tk-color-text-secondary);
                    font-size: 13px;

                    .record-card__team-badge {
                        flex: 0 0 16px;
                        width: 16px;
                        height: 16px;
                        object-fit: contain;
                    }

                    span {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
            }
        }

        .record-card__result {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 3px;
            min-height: 48px;
            padding-inline: 16px 10px;
            border-left: 1px solid var(--tk-color-border);

            .record-card__result-label {
                color: var(--tk-color-text-secondary);
                font-size: 14px;
            }

            .record-card__time {
                color: var(--tk-color-primary);
                font-size: 28px;
                font-weight: 700;
                line-height: 1.2;
                white-space: nowrap;
            }
        }

        .record-card__status {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
            min-width: 0;
            min-height: 48px;
            padding-inline: 12px;
            border-left: 1px solid var(--tk-color-border);

            .record-card__holding {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: 152px;
                height: 40px;
                box-sizing: border-box;
                color: var(--tk-color-bg);
                background-position: center;
                background-repeat: no-repeat;
                // 补偿素材四周的透明留白，等比展示完整的笔刷轮廓。
                background-size: 110% auto;
                font-size: 15px;
                font-weight: 700;
                line-height: 1;

                strong {
                    color: var(--tk-color-record-accent);
                    font-size: 24px;
                    font-weight: 700;
                    line-height: 1;
                }
            }

            .record-card__updated {
                color: var(--tk-color-text-secondary);
                font-size: 13px;
                line-height: 1.4;
                text-align: center;
                white-space: nowrap;
            }
        }
    }

    @media (max-width: 1050px) {
        .record-card__inner {
            grid-template-columns: minmax(0, 1fr) 156px 128px;

            .record-card__status {
                grid-column: 1 / -1;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 6px 16px;
                border-top: 1px solid var(--tk-color-border);
                border-left: 0;

                .record-card__holding {
                    flex: 0 0 152px;
                }
            }
        }
    }

    @media (max-width: 720px) {
        .record-card__inner {
            grid-template-columns: minmax(0, 1fr) 132px;

            .record-card__track {
                grid-column: 1 / -1;

                .record-card__image {
                    flex-basis: 40%;
                }

                .record-card__track-info {
                    .record-card__track-name {
                        font-size: 24px;
                    }
                }
            }

            .record-card__driver {
                padding: 8px 16px;
                border-left: 0;
            }

            .record-card__result {
                margin-block: 8px;
            }

            .record-card__status {
                flex-wrap: wrap;

                .record-card__updated {
                    font-size: 11px;
                }
            }
        }
    }
}
</style>
