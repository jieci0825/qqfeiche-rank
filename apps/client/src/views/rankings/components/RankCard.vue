<script setup lang="ts">
import type { RankingItem } from '@/api'
import RankIdentity from './RankIdentity.vue'
import RankArtwork from './RankArtwork.vue'

defineProps<{
    item: RankingItem
    rank: number
}>()
</script>

<template>
    <article
        class="rank-card"
        :aria-label="`第 ${rank} 名，${item.name}，国服数量 ${item.nationalRecordCount}`"
    >
        <RankArtwork class="rank-card__background" name="list-card" />
        <div class="rank-card__rank" aria-hidden="true">
            <RankArtwork class="rank-card__ring" name="rank-ring" />
            <span>{{ rank }}</span>
        </div>
        <RankIdentity class="rank-card__identity" :item="item" />
        <div class="rank-card__score">
            <span>国服数量</span>
            <strong>{{ item.nationalRecordCount }}</strong>
        </div>
    </article>
</template>

<style scoped lang="scss">
.rank-card {
    --ranking-accent: var(--tk-color-rank-gold);
    --ranking-name-size: clamp(21px, 2vw, 28px);
    --ranking-team-size: 14px;
    --rank-identity-gap: 12px;

    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 66px;
    align-items: center;
    gap: 12px;
    // 明确宽度，避免宽高比与最小高度反向撑大卡片，溢出所属网格。
    width: 100%;
    min-width: 0;
    max-width: 100%;
    aspect-ratio: 4.4 / 1;
    min-height: 90px;
    padding: 12px 16px;
    text-shadow: 0 1px 4px var(--tk-color-bg);

    .rank-card__background {
        position: absolute;
        z-index: -1;
        inset: 0;
        height: 100%;
    }

    .rank-card__rank {
        position: relative;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;

        .rank-card__ring {
            position: absolute;
            inset: 0;
            height: 100%;
        }

        span {
            position: relative;
            color: var(--tk-color-text);
            font-family: var(--tk-font-family-numeric);
            font-size: 30px;
            font-style: normal;
            font-weight: 600;
            line-height: 1;
        }
    }

    .rank-card__identity {
        min-width: 0;
    }

    .rank-card__score {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 48px;
        border-left: 1px solid color-mix(in srgb, var(--tk-color-primary) 35%, transparent);

        span {
            color: var(--tk-color-text-secondary);
            font-size: 14px;
            white-space: nowrap;
        }

        strong {
            color: var(--tk-color-rank-gold);
            font-family: var(--tk-font-family-numeric);
            font-size: 36px;
            font-style: italic;
            font-weight: 600;
            line-height: 1;
        }
    }

    @media (max-width: 1100px) and (min-width: 641px) {
        --ranking-avatar-size: 38px;
        --rank-identity-gap: 8px;
        --ranking-team-size: 12px;

        grid-template-columns: 34px minmax(0, 1fr) 56px;
        gap: 8px;
        padding-inline: 12px;

        .rank-card__rank {
            width: 34px;
            height: 34px;

            span {
                font-size: 26px;
            }
        }

        .rank-card__score {
            span {
                font-size: 12px;
            }
        }
    }

    @media (max-width: 480px) {
        --ranking-avatar-size: 44px;
        --rank-identity-gap: 10px;
        --ranking-name-size: 24px;

        grid-template-columns: 38px minmax(0, 1fr) 62px;
        gap: 10px;
        padding-inline: 14px;

        .rank-card__rank {
            width: 38px;
            height: 38px;
        }
    }
}
</style>
