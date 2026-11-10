<script setup lang="ts">
interface StackItem {
    name: string
    description: string
}

const stack: StackItem[] = [
    { name: 'Vue 3', description: '组合式 API + TypeScript' },
    { name: 'Vite', description: '开发服务器与构建工具' },
    { name: 'Vue Router', description: '单页应用路由' },
    { name: 'Pinia', description: '状态管理' },
    { name: 'Element Plus', description: '按需引入的 UI 组件库' },
    { name: 'Sass', description: '统一的样式组织方式' },
]
</script>

<template>
    <section class="page about-page">
        <el-card shadow="never">
            <template #header>
                <h2 class="card-title">技术栈</h2>
            </template>

            <ul class="stack-list">
                <li v-for="item in stack" :key="item.name" class="stack-item">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.description }}</span>
                </li>
            </ul>
        </el-card>

        <el-alert
            title="开始开发"
            type="success"
            :closable="false"
            show-icon
            description="根目录下 client、admin、server 分别是独立的项目；C 端与后台的样式分别集中在各自项目的 src/styles。"
        />
    </section>
</template>
