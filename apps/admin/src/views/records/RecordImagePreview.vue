<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@/icons'

const props = defineProps<{ src: string | null; trackName: string; label: string }>()
const emit = defineEmits<{ preview: [src: string] }>()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<template>
    <div class="record-image-preview">
        <button v-if="src && !failed" class="record-image-preview__button" type="button"
            :aria-label="`查看${trackName}的${label}`" @mousedown.prevent @click="emit('preview', src)">
            <img :key="src" :src="src" alt="" width="120" height="60" loading="lazy" @error="failed = true" />
        </button>
        <div v-else class="record-image-preview__empty">
            <Icon icon="ep:picture" aria-hidden="true" />
            <span>{{ failed ? `${label}加载失败` : `暂无${label}` }}</span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.record-image-preview {
    width: 120px;
    height: 60px;

    .record-image-preview__button,
    .record-image-preview__empty {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: var(--tk-radius-small);
        background: var(--el-fill-color-light);
    }

    .record-image-preview__button {
        padding: 0;
        border: 0;
        cursor: zoom-in;

        &:focus-visible {
            outline: 2px solid var(--tk-color-primary);
            outline-offset: 2px;
        }

        img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .record-image-preview__empty {
        gap: 4px;
        color: var(--tk-color-text-secondary);
        font-size: 12px;
    }
}
</style>
