<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const clientUrl = import.meta.env.DEV ? 'http://localhost:5173/' : '/'

const form = reactive({
    username: '',
    password: '',
})

function submit() {
    ElMessage.info('登录接口尚未接入，这里先展示表单与样式。')
}
</script>

<template>
    <div class="admin-login">
        <el-card class="admin-login__card" shadow="never">
            <template #header>
                <div class="admin-login__header">
                    <span class="admin-login__mark">Q</span>
                    <div>
                        <h1 class="admin-login__title">管理员登录</h1>
                        <p class="admin-login__subtitle">QQ 飞车手游国服记录榜</p>
                    </div>
                </div>
            </template>

            <el-form :model="form" label-position="top" @submit.prevent>
                <el-form-item label="用户名">
                    <el-input v-model="form.username" placeholder="请输入用户名" />
                </el-form-item>

                <el-form-item label="密码">
                    <el-input
                        v-model="form.password"
                        type="password"
                        show-password
                        placeholder="请输入密码"
                    />
                </el-form-item>

                <el-button type="primary" class="admin-login__submit" @click="submit">
                    登录
                </el-button>
            </el-form>

            <div class="admin-login__footer">
                <a :href="clientUrl">← 返回 C 端</a>
            </div>
        </el-card>
    </div>
</template>
