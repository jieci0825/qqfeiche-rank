<script setup lang="ts">
defineProps<{
    title: string
    description: string
}>()
</script>

<template>
    <el-card class="admin-section" shadow="never">
        <template #header>
            <span class="admin-card-title">{{ title }}</span>
        </template>

        <el-empty :description="description">
            <template #image>
                <span class="admin-section__empty-mark">Q</span>
            </template>
        </el-empty>
    </el-card>
</template>
