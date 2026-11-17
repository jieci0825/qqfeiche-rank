<script setup lang="ts">
import type { RankedDriver } from '@/data/drivers'
import DriverIdentity from './DriverIdentity.vue'
import RankArtwork from './RankArtwork.vue'

defineProps<{
    driver: RankedDriver
    rank: number
}>()
</script>

<template>
    <article
        class="driver-rank-card"
        :aria-label="`第 ${rank} 名，${driver.name}，国服数量 ${driver.nationalRecordCount}`"
    >
        <RankArtwork class="driver-rank-card__background" name="list-card" />
        <div class="driver-rank-card__rank" aria-hidden="true">
            <RankArtwork class="driver-rank-card__ring" name="rank-ring" />
            <span>{{ rank }}</span>
        </div>
        <DriverIdentity class="driver-rank-card__identity" :driver="driver" />
        <div class="driver-rank-card__score">
            <span>国服数量</span>
            <strong>{{ driver.nationalRecordCount }}</strong>
        </div>
    </article>
</template>

<style scoped lang="scss">
.driver-rank-card {
    --driver-accent: var(--tk-color-rank-gold);
    --driver-name-size: clamp(21px, 2vw, 28px);
    --driver-team-size: 14px;
    --driver-identity-gap: 12px;

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

    .driver-rank-card__background {
        position: absolute;
        z-index: -1;
        inset: 0;
        height: 100%;
    }

    .driver-rank-card__rank {
        position: relative;
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;

        .driver-rank-card__ring {
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

    .driver-rank-card__identity {
        min-width: 0;
    }

    .driver-rank-card__score {
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
        --driver-avatar-size: 38px;
        --driver-identity-gap: 8px;
        --driver-team-size: 12px;

        grid-template-columns: 34px minmax(0, 1fr) 56px;
        gap: 8px;
        padding-inline: 12px;

        .driver-rank-card__rank {
            width: 34px;
            height: 34px;

            span {
                font-size: 26px;
            }
        }

        .driver-rank-card__score {
            span {
                font-size: 12px;
            }
        }
    }

    @media (max-width: 480px) {
        --driver-avatar-size: 44px;
        --driver-identity-gap: 10px;
        --driver-name-size: 24px;

        grid-template-columns: 38px minmax(0, 1fr) 62px;
        gap: 10px;
        padding-inline: 14px;

        .driver-rank-card__rank {
            width: 38px;
            height: 38px;
        }
    }
}
</style>
