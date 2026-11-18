<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, apiErrorMessage } from '@/api/http'
import inkPeaks from '@/assets/login/ink-peaks.webp'
import { Icon } from '@/icons'
import { adminDestination } from '@/router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const passwordVisible = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

function loginErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 429) {
        const reason =
            error.code === 'ACCOUNT_LOCKED' ? '账号已锁定' : '登录请求过于频繁'
        const wait =
            error.retryAfter > 0
                ? `请在 ${Math.ceil(error.retryAfter / 60)} 分钟后重试`
                : '请稍后重试'
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
        passwordVisible.value = false
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
        <div class="admin-login__layout">
            <header class="admin-login__brand">
                <p class="admin-login__brand-title">QQ 飞车手游</p>
                <p class="admin-login__description">国服赛道记录与车手排行</p>
            </header>

            <section
                class="admin-login__content"
                aria-labelledby="admin-login-heading"
            >
                <header class="admin-login__header">
                    <div
                        class="admin-login__ornament"
                        aria-hidden="true"
                    >
                        <img
                            :src="inkPeaks"
                            alt=""
                            width="360"
                            height="120"
                        />
                    </div>
                    <h1 id="admin-login-heading">系统登录</h1>
                    <p class="admin-login__description">
                        请输入管理员账号和密码
                    </p>
                </header>

                <el-form
                    class="admin-login__form"
                    label-position="top"
                    :disabled="submitting"
                    @submit.prevent="submit"
                >
                    <el-form-item
                        class="admin-login__field"
                        label="账号"
                        for="username"
                    >
                        <el-input
                            id="username"
                            v-model.trim="username"
                            class="admin-login__input"
                            name="username"
                            placeholder="请输入账号"
                            autocomplete="username"
                            maxlength="64"
                            required
                        >
                            <template #prefix>
                                <Icon
                                    icon="ep:user"
                                    aria-hidden="true"
                                />
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-form-item
                        class="admin-login__field"
                        label="密码"
                        for="password"
                    >
                        <el-input
                            id="password"
                            v-model="password"
                            class="admin-login__input"
                            name="password"
                            :type="passwordVisible ? 'text' : 'password'"
                            autocomplete="current-password"
                            placeholder="请输入密码"
                            maxlength="256"
                            required
                        >
                            <template #prefix>
                                <Icon
                                    icon="ep:lock"
                                    aria-hidden="true"
                                />
                            </template>
                            <template #suffix>
                                <button
                                    class="admin-login__password-toggle"
                                    type="button"
                                    :aria-label="
                                        passwordVisible
                                            ? '隐藏密码'
                                            : '显示密码'
                                    "
                                    :disabled="submitting"
                                    @click="passwordVisible = !passwordVisible"
                                >
                                    <Icon
                                        :icon="
                                            passwordVisible
                                                ? 'ep:hide'
                                                : 'ep:view'
                                        "
                                        aria-hidden="true"
                                    />
                                </button>
                            </template>
                        </el-input>
                    </el-form-item>

                    <p
                        v-if="errorMessage"
                        class="admin-login__error"
                        role="alert"
                    >
                        <Icon
                            icon="ep:warning"
                            aria-hidden="true"
                        />
                        <span>{{ errorMessage }}</span>
                    </p>

                    <el-button
                        class="admin-login__submit"
                        type="primary"
                        native-type="submit"
                        :loading="submitting"
                    >
                        {{ submitting ? '登录中…' : '登录' }}
                    </el-button>
                </el-form>
            </section>
        </div>
    </main>
</template>

<style scoped lang="scss">
.admin-login {
    --tk-login-control-height: 44px;
    --tk-login-card-bg: color-mix(
        in srgb,
        var(--tk-color-bg-surface) 30%,
        transparent
    );

    display: grid;
    place-items: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 40px 7vw;
    background: var(--tk-color-bg-page) url('@/assets/login/landscape.webp')
        center / cover no-repeat;
    color: var(--tk-color-text-primary);

    .admin-login__layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 55.5%);
        align-items: center;
        gap: clamp(24px, 5vw, 76px);
        width: min(100%, 1316px);

        .admin-login__brand {
            padding-inline-start: clamp(0px, 3.4vw, 52px);

            .admin-login__brand-title {
                margin: 0;
                font-size: clamp(34px, 3.4vw, 52px);
                font-weight: 700;
                line-height: 1.2;
                letter-spacing: 0.04em;
            }

            .admin-login__description {
                margin-top: 16px;
                letter-spacing: 0.1em;
            }
        }

        .admin-login__description {
            margin: 0;
            color: var(--tk-color-text-secondary);
            font-size: clamp(16px, 1.45vw, 22px);
            line-height: 1.5;
        }

        .admin-login__content {
            justify-self: center;
            width: min(100%, 480px);
            padding: 30px;
            border: 1px solid var(--tk-color-border);
            border-radius: var(--tk-radius-base);
            background: var(--tk-login-card-bg);

            .admin-login__header {
                text-align: center;

                .admin-login__description {
                    font-size: 15px;
                }

                .admin-login__ornament {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 12px;

                    &::before,
                    &::after {
                        width: 80px;
                        height: 1px;
                        margin-bottom: 8px;
                        background: linear-gradient(
                            to right,
                            transparent,
                            var(--tk-color-border-strong)
                        );
                        content: '';
                    }

                    &::after {
                        transform: scaleX(-1);
                    }

                    img {
                        width: 90px;
                        height: auto;
                    }
                }

                h1 {
                    margin: 0 0 8px;
                    font-size: 32px;
                    font-weight: 700;
                    line-height: 1.2;
                    letter-spacing: 0.04em;
                }
            }

            .admin-login__form {
                display: grid;
                gap: 16px;
                margin-top: 24px;

                .admin-login__field {
                    margin-bottom: 0;

                    :deep(.el-form-item__label) {
                        position: absolute;
                        width: 1px;
                        height: 1px;
                        padding: 0;
                        overflow: hidden;
                        clip-path: inset(50%);
                        white-space: nowrap;
                    }

                    .admin-login__input {
                        --el-input-height: var(--tk-login-control-height);
                        --el-input-border-radius: var(--tk-radius-base);
                        --el-input-bg-color: var(--tk-login-card-bg);

                        font-size: 16px;

                        :deep(.el-input__wrapper) {
                            padding-inline: 14px;
                        }

                        :deep(.el-input__prefix-inner > svg) {
                            margin-right: 0.75em;
                            color: var(--tk-color-text-secondary);
                            font-size: 1.25em;
                        }

                        .admin-login__password-toggle {
                            display: grid;
                            place-items: center;
                            width: 36px;
                            height: 36px;
                            margin-inline: 4px -6px;
                            padding: 0;
                            border: 0;
                            border-radius: var(--tk-radius-base);
                            background: transparent;
                            color: var(--tk-color-text-secondary);
                            font-size: 1.25em;
                            cursor: pointer;

                            &:hover:not(:disabled) {
                                background: var(--tk-color-bg-hover);
                                color: var(--tk-color-text-primary);
                            }

                            &:focus-visible {
                                outline: 2px solid var(--tk-color-focus-ring);
                                outline-offset: -2px;
                            }

                            &:disabled {
                                color: var(--tk-color-text-disabled);
                                cursor: not-allowed;
                            }

                            svg {
                                margin: 0;
                            }
                        }
                    }
                }

                .admin-login__error {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin: 0;
                    padding: 8px 10px;
                    border: 1px solid var(--tk-color-error-border);
                    border-radius: var(--tk-radius-base);
                    background: var(--tk-color-error-subtle);
                    color: var(--tk-color-error-active);
                    font-size: 14px;
                    line-height: 1.5;
                    overflow-wrap: anywhere;

                    svg {
                        flex: none;
                        margin-top: 3px;
                    }
                }

                .admin-login__submit {
                    --el-button-outline-color: var(--tk-color-focus-ring);

                    width: 100%;
                    height: var(--tk-login-control-height);
                    margin-top: 6px;
                    border-radius: var(--tk-radius-base);
                    font-size: 16px;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                }
            }
        }
    }

    @media (max-width: 760px) {
        padding-inline: 20px;
        background-position: 26% center;

        .admin-login__layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 28px;

            .admin-login__brand {
                padding-inline-start: 0;
                text-align: center;

                .admin-login__description {
                    margin-top: 8px;
                }
            }

            .admin-login__content {
                background: color-mix(
                    in srgb,
                    var(--tk-color-bg-surface) 82%,
                    transparent
                );
            }
        }
    }
}
</style>
