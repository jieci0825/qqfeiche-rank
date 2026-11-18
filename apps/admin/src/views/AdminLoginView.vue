<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, apiErrorMessage } from '@/api/http'
import { adminDestination } from '@/router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

function loginErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 429) {
        const reason = error.code === 'ACCOUNT_LOCKED' ? '账号已锁定' : '登录请求过于频繁'
        const wait = error.retryAfter > 0 ? `请在 ${Math.ceil(error.retryAfter / 60)} 分钟后重试` : '请稍后重试'
        return `${reason}，${wait}`
    }
    return apiErrorMessage(error)
}

async function submit() {
    if (submitting.value) return

    submitting.value = true
    errorMessage.value = ''
    try {
        await auth.login({ username: username.value, password: password.value })
        password.value = ''
        await router.replace(adminDestination(route.query.redirect))
    } catch (error) {
        errorMessage.value = loginErrorMessage(error)
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <main class="admin-login">
        <el-card class="admin-login__card" shadow="never">
            <h1>管理员登录</h1>

            <el-form class="admin-login__form" label-position="top" :disabled="submitting" @submit.prevent="submit">
                <el-form-item class="admin-login__field" label="用户名" for="username">
                    <el-input id="username" v-model.trim="username" name="username" autocomplete="username"
                        maxlength="64" required />
                </el-form-item>
                <el-form-item class="admin-login__field" label="密码" for="password">
                    <el-input id="password" v-model="password" name="password" type="password"
                        autocomplete="current-password" maxlength="256" required />
                </el-form-item>

                <p v-if="errorMessage" class="admin-login__error" role="alert">{{ errorMessage }}</p>
                <el-button type="primary" native-type="submit" :loading="submitting">登录</el-button>
            </el-form>
        </el-card>
    </main>
</template>
