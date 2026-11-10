<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const stats = [
    { label: '赛道', value: 0 },
    { label: '有效记录', value: 0 },
    { label: '车手', value: 0 },
    { label: '车队', value: 0 },
]

function showMessage() {
    ElMessage.success('按需引入生效：ElMessage 的样式已手动引入')
}
</script>

<template>
    <div class="admin-dashboard">
        <el-alert
            title="后台骨架已就绪"
            type="info"
            :closable="false"
            show-icon
            description="登录、接口鉴权与业务表单将在后续接入。左侧菜单仅用于演示目录结构。"
        />

        <div class="admin-stat-grid">
            <el-card v-for="item in stats" :key="item.label" shadow="never">
                <div class="admin-stat">
                    <span class="admin-stat__label">{{ item.label }}</span>
                    <strong class="admin-stat__value">{{ item.value }}</strong>
                </div>
            </el-card>
        </div>

        <el-card shadow="never">
            <template #header>
                <span class="admin-card-title">快速开始</span>
            </template>

            <p class="admin-hint">
                选择左侧菜单进入对应模块，或先验证按需引入的 Element Plus 组件与
                Sass 样式。
            </p>

            <div class="admin-actions">
                <el-button type="primary" @click="showMessage">测试 ElMessage</el-button>
                <el-button @click="router.push('/admin/records/new')">录入成绩</el-button>
            </div>
        </el-card>
    </div>
</template>
