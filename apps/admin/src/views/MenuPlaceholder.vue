<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
    <section>
        <h1>{{ route.meta.title }}</h1>
        <p>页面建设中</p>
    </section>
</template>
