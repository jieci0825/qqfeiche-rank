<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
    <div class="admin-app">
        <header class="admin-header"></header>

        <main class="admin-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped lang="scss">
.admin-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;

    .admin-header {
        flex: 0 0 50px;
        height: 50px;
    }

    .admin-main {
        flex: 1;
        min-height: 0;
        overflow: auto;
    }
}
</style>
