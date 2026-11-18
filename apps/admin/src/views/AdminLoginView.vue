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

            <form class="admin-login__form" @submit.prevent="submit">
                <label class="admin-login__field" for="username">
                    用户名
                    <input id="username" v-model.trim="username" name="username" autocomplete="username"
                        maxlength="64" required :disabled="submitting" />
                </label>
                <label class="admin-login__field" for="password">
                    密码
                    <input id="password" v-model="password" name="password" type="password"
                        autocomplete="current-password" maxlength="256" required :disabled="submitting" />
                </label>

                <p v-if="errorMessage" class="admin-login__error" role="alert">{{ errorMessage }}</p>
                <el-button type="primary" native-type="submit" :loading="submitting">登录</el-button>
            </form>
        </el-card>
    </main>
</template>

<style scoped lang="scss">
.admin-login {
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: 24px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);

    .admin-login__card {
        width: 100%;
        max-width: 400px;
        --el-card-padding: 28px;

        h1 {
            margin: 0 0 24px;
            font-size: 24px;
        }

        .admin-login__form {
            display: grid;
            gap: 16px;

            .admin-login__field {
                display: grid;
                gap: 8px;
                font-size: 14px;

                input {
                    width: 100%;
                    min-height: 36px;
                    padding: 0 12px;
                    border: 1px solid var(--el-border-color);
                    border-radius: var(--el-border-radius-base);
                    background: var(--el-bg-color);
                    color: inherit;
                    font: inherit;

                    &:focus-visible {
                        outline: 2px solid var(--el-color-primary);
                        outline-offset: -1px;
                    }
                }
            }

            .admin-login__error {
                margin: 0;
                color: var(--el-color-danger);
                font-size: 14px;
            }
        }
    }
}
</style>
