<script setup lang="ts">
import type { RankedDriver } from '@/data/drivers'
import defaultDriverUrl from '@/assets/record-board/default-driver.svg?url'
import defaultTeamUrl from '@/assets/record-board/default-team.svg?url'
import FallbackImage from '@/views/records/components/FallbackImage.vue'

defineProps<{ driver: RankedDriver }>()
</script>

<template>
    <div class="driver-identity">
        <FallbackImage
            class="driver-identity__avatar"
            :src="driver.avatar"
            :fallback="defaultDriverUrl"
            alt=""
        />
        <div class="driver-identity__details">
            <h2 class="driver-identity__name" :title="driver.name">{{ driver.name }}</h2>
            <div class="driver-identity__team">
                <FallbackImage
                    class="driver-identity__team-badge"
                    :src="driver.team.badge"
                    :fallback="defaultTeamUrl"
                    alt=""
                />
                <span :title="driver.team.name">车队：{{ driver.team.name }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.driver-identity {
    display: flex;
    align-items: center;
    gap: var(--driver-identity-gap, 12px);
    min-width: 0;

    .driver-identity__avatar {
        flex: 0 0 var(--driver-avatar-size, 48px);
        width: var(--driver-avatar-size, 48px);
        height: var(--driver-avatar-size, 48px);
        border: 1px solid color-mix(in srgb, var(--driver-accent, var(--tk-color-primary)) 55%, transparent);
        border-radius: var(--tk-radius-avatar);
        background: color-mix(in srgb, var(--tk-color-text) 8%, var(--tk-color-bg));
        object-fit: cover;
    }

    .driver-identity__details {
        flex: 1;
        min-width: 0;

        .driver-identity__name {
            margin: 0 0 6px;
            overflow: hidden;
            color: var(--tk-color-text);
            font-size: var(--driver-name-size, 24px);
            font-weight: 500;
            line-height: 1.2;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .driver-identity__team {
            display: flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
            color: var(--tk-color-text-secondary);
            font-size: var(--driver-team-size, 15px);
            line-height: 1.3;

            .driver-identity__team-badge {
                flex: 0 0 var(--driver-team-icon-size, 18px);
                width: var(--driver-team-icon-size, 18px);
                height: var(--driver-team-icon-size, 18px);
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
</style>
