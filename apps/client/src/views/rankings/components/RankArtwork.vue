<script setup lang="ts">
import { computed } from 'vue'
import { clientImageUrl } from '@/api/modules/client-assets'
import manifest from '@/assets/driver-rank/manifest.json'
import dividerGold from '@/assets/driver-rank/stat-divider-gold.svg?url'
import dividerSilver from '@/assets/driver-rank/stat-divider-silver.svg?url'
import dividerBronze from '@/assets/driver-rank/stat-divider-bronze.svg?url'
import countUnderline from '@/assets/driver-rank/count-underline.svg?url'

type Medal = 'gold' | 'silver' | 'bronze'
type ArtworkName =
    | `podium-${Medal}`
    | `badge-${Medal}`
    | `stat-divider-${Medal}`
    | 'list-card'
    | 'rank-ring'
    | 'section-divider'
    | 'title-brush'
    | 'score-laurels'
    | 'count-underline'

const svgSources: Partial<Record<ArtworkName, string>> = {
    'stat-divider-gold': dividerGold,
    'stat-divider-silver': dividerSilver,
    'stat-divider-bronze': dividerBronze,
    'count-underline': countUnderline,
}

const props = withDefaults(defineProps<{
    name: ArtworkName
    eager?: boolean
}>(), { eager: false })

const artworkUrl = computed(() => svgSources[props.name] ?? clientImageUrl(props.name))

const geometry = computed(() => {
    const asset = manifest.assets.find(item => item.id === props.name)
    const width = asset?.width ?? 1
    const height = asset?.height ?? 1
    const [left = 0, top = 0, right = width, bottom = height] = asset?.contentBounds ?? []
    const visibleWidth = right - left
    const visibleHeight = bottom - top

    return {
        ratio: `${visibleWidth} / ${visibleHeight}`,
        imageStyle: {
            width: `${width / visibleWidth * 100}%`,
            height: `${height / visibleHeight * 100}%`,
            left: `${-left / visibleWidth * 100}%`,
            top: `${-top / visibleHeight * 100}%`,
        },
    }
})
</script>

<template>
    <span
        class="rank-artwork"
        :style="{ aspectRatio: geometry.ratio }"
        aria-hidden="true"
    >
        <img
            :src="artworkUrl"
            :style="geometry.imageStyle"
            :loading="eager ? 'eager' : 'lazy'"
            decoding="async"
            alt=""
        />
    </span>
</template>

<style scoped lang="scss">
.rank-artwork {
    position: relative;
    display: block;
    width: 100%;
    pointer-events: none;

    img {
        position: absolute;
        display: block;
        max-width: none;
    }
}
</style>
