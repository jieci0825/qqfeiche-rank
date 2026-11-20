<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

const props = defineProps<{ label: string; existingUrl?: string | null; fallbackUrl: string; disabled: boolean }>()
const file = defineModel<File | null>({ required: true })
const error = defineModel<string>('error', { required: true })
const input = ref<HTMLInputElement>()
const hintId = useId()
const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const preview = ref('')
const customImage = computed(() => preview.value || props.existingUrl)

watch(file, (selected, _, onCleanup) => {
    if (!selected) {
        preview.value = ''
        return
    }
    const url = URL.createObjectURL(selected)
    preview.value = url
    onCleanup(() => URL.revokeObjectURL(url))
})

function clearSelection() {
    file.value = null
    error.value = ''
}

function selectImage(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const selected = target.files?.[0]
    target.value = ''
    if (!selected || props.disabled) return

    clearSelection()
    if (!imageTypes.includes(selected.type)) {
        error.value = '请选择 JPEG、PNG 或 WebP 图片'
    } else if (selected.size === 0 || selected.size > 5 * 1024 * 1024) {
        error.value = '图片须大于 0 字节且不超过 5 MB'
    } else {
        file.value = selected
    }
}
</script>

<template>
    <div class="data-image-field">
        <el-image class="data-image-field__preview" :src="customImage || fallbackUrl" fit="cover"
            :alt="customImage ? `${label}预览` : `默认${label}`">
            <template v-if="customImage" #error>
                <span v-if="preview" class="data-image-field__hint">无法预览此图片</span>
                <el-image v-else class="data-image-field__preview" :src="fallbackUrl" fit="cover" :alt="`默认${label}`" />
            </template>
        </el-image>
        <input ref="input" type="file" :accept="imageTypes.join(',')" :disabled="disabled" hidden @change="selectImage" />
        <div class="data-image-field__controls">
            <el-button :aria-describedby="hintId" :aria-label="`${customImage ? '更换' : '选择'}${label}`"
                :disabled="disabled" @click="input?.click()">
                {{ customImage ? '更换图片' : '选择图片' }}
            </el-button>
            <el-button v-if="file || error" link :disabled="disabled" @click="clearSelection">
                {{ file ? '取消选择' : '清除提示' }}
            </el-button>
        </div>
        <div :id="hintId" class="data-image-field__hint" aria-live="polite">
            支持 JPEG、PNG、WebP，最大 5 MB。
            <div v-if="file">已选择「{{ file.name }}」，保存时上传。</div>
        </div>
        <p v-if="error" class="data-image-field__error" role="alert">{{ error }}</p>
    </div>
</template>

<style scoped lang="scss">
.data-image-field {
    display: grid;
    gap: 8px;
    width: 100%;
    min-width: 0;

    .data-image-field__preview {
        display: grid;
        place-items: center;
        width: 168px;
        max-width: 100%;
        height: 96px;
    }

    .data-image-field__controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .el-button + .el-button {
            margin-inline-start: 0;
        }
    }

    .data-image-field__hint {
        color: var(--tk-color-text-secondary);
        line-height: 1.5;
        overflow-wrap: anywhere;
    }

    .data-image-field__error {
        margin: 0;
        color: var(--tk-color-error);
        line-height: 1.5;
    }
}
</style>
