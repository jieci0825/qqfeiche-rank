<script setup lang="ts">
import { Icon } from '@/icons'
import { trackDistance, trackDistanceLabels } from '../record-display'

defineProps<{
    timeMs: number | null
    stars: number | null
    archived?: boolean
}>()
</script>

<template>
    <div v-if="timeMs !== null || stars !== null || archived" class="track-record-tags">
        <span v-if="timeMs !== null" class="track-record-tags__tag">
            距离：{{ trackDistanceLabels[trackDistance(timeMs)] }}
        </span>
        <span v-if="stars !== null" class="track-record-tags__tag">
            星级：
            <span
                class="track-record-tags__stars"
                role="img"
                :aria-label="`${stars} 星`"
            >
                <Icon
                    v-for="star in stars"
                    :key="star"
                    icon="ep:star-filled"
                    aria-hidden="true"
                />
            </span>
        </span>
        <span v-if="archived">已归档</span>
    </div>
</template>

<style scoped lang="scss">
.track-record-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    color: var(--tk-color-text-secondary);

    .track-record-tags__tag {
        display: inline-flex;
        align-items: center;
        min-height: 20px;
        padding: 1px 5px;
        border: 1px solid
            color-mix(in srgb, var(--tk-color-text-secondary) 48%, transparent);
        border-radius: 3px;
        font-size: 12px;
        line-height: 1.4;
        white-space: nowrap;

        .track-record-tags__stars {
            display: inline-flex;
            color: var(--tk-color-primary);

            svg {
                width: 11px;
                height: 11px;
            }
        }
    }
}
</style>
