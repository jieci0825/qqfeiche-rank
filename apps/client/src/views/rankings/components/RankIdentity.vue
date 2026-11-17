<script setup lang="ts">
import type { RankingItem } from '@/data/rankings'
import defaultDriverUrl from '@/assets/record-board/default-driver.svg?url'
import defaultCarUrl from '@/assets/rankings/default-car.png'
import defaultPetUrl from '@/assets/rankings/default-pet.png'
import defaultTeamUrl from '@/assets/record-board/default-team.svg?url'
import FallbackImage from '@/views/records/components/FallbackImage.vue'

defineProps<{ item: RankingItem }>()

const defaultImages = {
    driver: defaultDriverUrl,
    car: defaultCarUrl,
    pet: defaultPetUrl,
}
</script>

<template>
    <div class="rank-identity" :class="{ 'rank-identity--without-team': item.category !== 'driver' }">
        <FallbackImage
            class="rank-identity__avatar"
            :src="item.image"
            :fallback="defaultImages[item.category]"
            alt=""
        />
        <div class="rank-identity__details">
            <h2 class="rank-identity__name" :title="item.name">{{ item.name }}</h2>
            <div v-if="item.category === 'driver'" class="rank-identity__team">
                <FallbackImage
                    class="rank-identity__team-badge"
                    :src="item.team.badge"
                    :fallback="defaultTeamUrl"
                    alt=""
                />
                <span :title="item.team.name">车队：{{ item.team.name }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.rank-identity {
    display: flex;
    align-items: center;
    gap: var(--rank-identity-gap, 12px);
    min-width: 0;

    .rank-identity__avatar {
        flex: 0 0 var(--ranking-avatar-size, 48px);
        width: var(--ranking-avatar-size, 48px);
        height: var(--ranking-avatar-size, 48px);
        border: 1px solid color-mix(in srgb, var(--ranking-accent, var(--tk-color-primary)) 55%, transparent);
        border-radius: var(--tk-radius-avatar);
        background: color-mix(in srgb, var(--tk-color-text) 8%, var(--tk-color-bg));
        object-fit: cover;
    }

    .rank-identity__details {
        flex: 1;
        min-width: 0;

        .rank-identity__name {
            margin: 0 0 6px;
            overflow: hidden;
            color: var(--tk-color-text);
            font-size: var(--ranking-name-size, 24px);
            font-weight: 500;
            line-height: 1.2;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .rank-identity__team {
            display: flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
            color: var(--tk-color-text-secondary);
            font-size: var(--ranking-team-size, 15px);
            line-height: 1.3;

            .rank-identity__team-badge {
                flex: 0 0 var(--ranking-team-icon-size, 18px);
                width: var(--ranking-team-icon-size, 18px);
                height: var(--ranking-team-icon-size, 18px);
                object-fit: contain;
            }

            span {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    &.rank-identity--without-team {
        .rank-identity__details {
            .rank-identity__name {
                margin-bottom: 0;
            }
        }
    }
}
</style>
