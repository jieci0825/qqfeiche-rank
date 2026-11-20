<script setup lang="ts">
import { computed } from 'vue'
import type { RankingItem } from '@/api'
import RankIdentity from './RankIdentity.vue'
import RankArtwork from './RankArtwork.vue'

const props = defineProps<{
    item: RankingItem
    rank: 1 | 2 | 3
}>()
const medal = computed(() => ({ 1: 'gold', 2: 'silver', 3: 'bronze' } as const)[props.rank])
</script>

<template>
    <article
        class="podium-card"
        :class="`podium-card--${medal}`"
        :aria-label="`第 ${rank} 名，${item.name}，国服数量 ${item.nationalRecordCount}`"
    >
        <RankArtwork class="podium-card__background" :name="`podium-${medal}`" eager />
        <div class="podium-card__badge" aria-hidden="true">
            <RankArtwork :name="`badge-${medal}`" eager />
            <span class="podium-card__rank">{{ rank }}</span>
        </div>
        <div class="podium-card__content">
            <RankIdentity :item="item" />
            <div class="podium-card__score">
                <div class="podium-card__score-label">
                    <RankArtwork class="podium-card__score-divider" :name="`stat-divider-${medal}`" eager />
                    <span>国服数量</span>
                </div>
                <div class="podium-card__score-value">
                    <RankArtwork v-if="rank === 1" class="podium-card__laurels" name="score-laurels" eager />
                    <strong>{{ item.nationalRecordCount }}</strong>
                </div>
            </div>
        </div>
    </article>
</template>

<style scoped lang="scss">
.podium-card {
    --ranking-accent: var(--tk-color-rank-gold);
    --ranking-avatar-size: 18cqw;
    --rank-identity-gap: 4cqw;
    --ranking-name-size: 9.5cqw;
    --ranking-team-size: 4.6cqw;
    --ranking-team-icon-size: 6cqw;

    position: relative;
    isolation: isolate;
    container-type: inline-size;
    min-width: 0;
    aspect-ratio: 2 / 1;
    color: var(--ranking-accent);
    text-shadow: 0 2px 5px var(--tk-color-bg);

    &.podium-card--gold {
        --ranking-avatar-size: 18.5cqw;

        grid-column: 2;
        grid-row: 1;
    }

    &.podium-card--silver {
        --ranking-accent: var(--tk-color-rank-silver);

        grid-column: 1;
        grid-row: 1;
    }

    &.podium-card--bronze {
        --ranking-accent: var(--tk-color-rank-bronze);

        grid-column: 3;
        grid-row: 1;
    }

    .podium-card__background {
        position: absolute;
        z-index: -1;
        inset: 0;
        height: 100%;
    }

    .podium-card__badge {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 50%;
        width: 29%;
        transform: translate(-50%, -76%);

        .podium-card__rank {
            position: absolute;
            top: 50%;
            left: 50%;
            display: block;
            width: max-content;
            font-family: var(--tk-font-family-numeric);
            font-size: 12cqw;
            font-style: normal;
            font-weight: 600;
            line-height: 1;
            // 补偿字体行盒的竖向留白，让可见字形居中。
            transform: translate(-50%, -50%) translateY(-0.05em);
        }
    }

    .podium-card__content {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        padding: 5% 11% 2%;

        .podium-card__score {
            .podium-card__score-label {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 5cqw;
                line-height: 1.2;
                white-space: nowrap;

                .podium-card__score-divider {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                }

                span {
                    position: relative;
                }
            }

            .podium-card__score-value {
                position: relative;
                text-align: center;

                .podium-card__laurels {
                    position: absolute;
                    inset-inline: 8%;
                    bottom: 12%;
                    width: 84%;
                }

                strong {
                    position: relative;
                    font-family: var(--tk-font-family-numeric);
                    font-size: 17cqw;
                    font-style: italic;
                    font-weight: 600;
                    line-height: 1;
                }
            }
        }
    }

    &.podium-card--gold {
        .podium-card__badge {
            width: 31%;

            .podium-card__rank {
                font-size: 14cqw;
            }
        }

        .podium-card__content {
            .podium-card__score {
                .podium-card__score-value {
                    strong {
                        font-size: 18cqw;
                        text-shadow: 0 0 16px color-mix(in srgb, var(--ranking-accent) 45%, transparent);
                    }
                }
            }
        }
    }

    @media (max-width: 760px) {
        &.podium-card--gold {
            grid-column: 1 / -1;
            grid-row: 1;
            justify-self: center;
            width: min(100%, 460px);
        }

        &.podium-card--silver {
            grid-column: 1;
            grid-row: 2;
        }

        &.podium-card--bronze {
            grid-column: 2;
            grid-row: 2;
        }
    }

    @media (max-width: 640px) {
        &.podium-card--gold,
        &.podium-card--silver,
        &.podium-card--bronze {
            grid-column: 1;
            grid-row: auto;
            justify-self: center;
            width: min(100%, 460px);
        }
    }
}
</style>
