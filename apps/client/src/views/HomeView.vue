<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
const { count, doubled } = storeToRefs(counter)
</script>

<template>
    <section class="page home-page">
        <div class="hero">
            <el-tag effect="plain" round>Vue 3 + Vite + TypeScript</el-tag>
            <h1 class="hero__title">qqfeiche-rank</h1>
            <p class="hero__description">
                空白项目已搭建完成，Pinia、Vue Router 与 Element Plus 均已就绪。
            </p>
            <div class="hero__actions">
                <el-button type="primary" size="large" @click="counter.increment">
                    计数 +1
                </el-button>
                <el-button size="large" @click="counter.reset">重置</el-button>
            </div>
        </div>

        <div class="content-grid">
            <el-card shadow="never">
                <template #header>
                    <div class="card-header">
                        <span>Pinia 状态</span>
                        <el-tag type="success" size="small" effect="light">已接入</el-tag>
                    </div>
                </template>

                <div class="stat-grid">
                    <div class="stat">
                        <span class="stat__label">count</span>
                        <strong class="stat__value">{{ count }}</strong>
                    </div>
                    <div class="stat">
                        <span class="stat__label">doubled</span>
                        <strong class="stat__value">{{ doubled }}</strong>
                    </div>
                </div>

                <p class="hint">
                    状态定义在 <code>client/src/stores/counter.ts</code>。
                </p>
            </el-card>

            <el-card shadow="never">
                <template #header>
                    <div class="card-header">
                        <span>下一步</span>
                        <el-tag size="small" effect="light">Vue Router</el-tag>
                    </div>
                </template>

                <p class="hint">
                    路由配置在 <code>client/src/router/index.ts</code>，新增页面后在这里注册即可。
                </p>

                <RouterLink class="link" to="/about">查看关于页 →</RouterLink>
            </el-card>
        </div>
    </section>
</template>
