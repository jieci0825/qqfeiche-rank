<script setup lang="ts">
import { computed } from 'vue'
import manifest from '@/assets/driver-rank/manifest.json'
import podiumGold from '@/assets/driver-rank/podium-gold.png'
import podiumSilver from '@/assets/driver-rank/podium-silver.png'
import podiumBronze from '@/assets/driver-rank/podium-bronze.png'
import badgeGold from '@/assets/driver-rank/badge-gold.png'
import badgeSilver from '@/assets/driver-rank/badge-silver.png'
import badgeBronze from '@/assets/driver-rank/badge-bronze.png'
import listCard from '@/assets/driver-rank/list-card.png'
import rankRing from '@/assets/driver-rank/rank-ring.png'
import sectionDivider from '@/assets/driver-rank/section-divider.png'
import titleBrush from '@/assets/driver-rank/title-brush.png'
import scoreLaurels from '@/assets/driver-rank/score-laurels.png'
import dividerGold from '@/assets/driver-rank/stat-divider-gold.svg?url'
import dividerSilver from '@/assets/driver-rank/stat-divider-silver.svg?url'
import dividerBronze from '@/assets/driver-rank/stat-divider-bronze.svg?url'
import countUnderline from '@/assets/driver-rank/count-underline.svg?url'

const sources = {
    'podium-gold': podiumGold,
    'podium-silver': podiumSilver,
    'podium-bronze': podiumBronze,
    'badge-gold': badgeGold,
    'badge-silver': badgeSilver,
    'badge-bronze': badgeBronze,
    'list-card': listCard,
    'rank-ring': rankRing,
    'section-divider': sectionDivider,
    'title-brush': titleBrush,
    'score-laurels': scoreLaurels,
    'stat-divider-gold': dividerGold,
    'stat-divider-silver': dividerSilver,
    'stat-divider-bronze': dividerBronze,
    'count-underline': countUnderline,
}

const props = withDefaults(defineProps<{
    name: keyof typeof sources
    eager?: boolean
}>(), { eager: false })

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
            :src="sources[name]"
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
