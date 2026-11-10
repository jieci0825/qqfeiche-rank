<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const adminUrl = import.meta.env.DEV ? 'http://localhost:5174/admin/' : '/admin/'
</script>

<template>
    <div class="client-app">
        <header class="client-header">
            <RouterLink class="client-brand" to="/">
                <span class="client-brand__mark">Q</span>
                <span>qqfeiche-rank</span>
            </RouterLink>

            <nav class="client-nav">
                <RouterLink to="/">首页</RouterLink>
                <RouterLink to="/about">关于</RouterLink>
                <a class="client-nav__admin" :href="adminUrl">后台管理</a>
            </nav>
        </header>

        <main class="client-main">
            <RouterView />
        </main>

        <footer class="client-footer">
            Vue 3 · Vite · Pinia · Vue Router · Element Plus
        </footer>
    </div>
</template>
