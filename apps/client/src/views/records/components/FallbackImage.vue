<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
    src?: string | null
    fallback: string
    alt: string
}>()
const failed = ref(false)
const imageSource = computed(() => failed.value || !props.src ? props.fallback : props.src)

watch(() => props.src, () => { failed.value = false })
</script>

<template>
    <img
        :src="imageSource"
        :alt="alt"
        loading="lazy"
        decoding="async"
        @error="failed = true"
    />
</template>
