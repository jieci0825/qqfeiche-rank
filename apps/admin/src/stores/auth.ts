import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { postAuth } from '@/api/auth'
import type { AdminSession, Credentials } from '@/api/auth'
import { ApiError, readApiResponse, requestApi } from '@/api/http'
import type { AdminApiPath, ApiOptions } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
    const session = shallowRef<AdminSession | null>(null)
    const admin = computed(() => session.value?.admin ?? null)
    const isLoggedIn = computed(() => session.value !== null)
    let sessionVersion = 0
    let sessionChecked = false
    let pendingLogin: Promise<void> | undefined
    let pendingRefresh: Promise<void> | undefined
    let pendingLogout: Promise<void> | undefined

    function clearSession() {
        sessionVersion++
        session.value = null
    }

    function refresh() {
        if (!pendingRefresh) {
            pendingRefresh = postAuth<AdminSession>('refresh')
                .then(grant => { session.value = grant })
                .catch(clearSession)
                .finally(() => {
                    sessionChecked = true
                    pendingRefresh = undefined
                })
        }
        return pendingRefresh
    }

    async function restoreSession() {
        if (pendingLogout) await pendingLogout.catch(() => undefined)
        if (!sessionChecked) await refresh()
    }

    function login(credentials: Credentials) {
        if (pendingLogin) return pendingLogin

        pendingLogin = (async () => {
            await pendingLogout?.catch(() => undefined)
            await pendingRefresh
            const grant = await postAuth<AdminSession>('login', credentials)
            sessionVersion++
            session.value = grant
            sessionChecked = true
        })().finally(() => { pendingLogin = undefined })
        return pendingLogin
    }

    function logout() {
        if (pendingLogout) return pendingLogout

        pendingLogout = (async () => {
            await pendingLogin?.catch(() => undefined)
            await pendingRefresh
            await postAuth<void>('logout', undefined, session.value?.accessToken)
        })().finally(() => {
            sessionChecked = true
            clearSession()
            pendingLogout = undefined
        })
        return pendingLogout
    }

    async function request<T>(path: AdminApiPath, options?: ApiOptions): Promise<T> {
        const version = sessionVersion
        const token = session.value?.accessToken
        if (!token || pendingLogout) {
            throw new ApiError(401, 'INVALID_SESSION', '请重新登录', 0)
        }

        const response = await requestApi(path, options, token)
        if (response.status !== 401 || pendingLogout || version !== sessionVersion) {
            return readApiResponse<T>(response)
        }

        // 较晚返回的 401 可以直接使用已续签的令牌。
        if (token === session.value?.accessToken) await refresh()
        const retryToken = session.value?.accessToken
        if (!retryToken || pendingLogout || version !== sessionVersion) {
            return readApiResponse<T>(response)
        }

        const retry = await requestApi(path, options, retryToken)
        if (retry.status === 401 && !pendingRefresh && !pendingLogout && retryToken === session.value?.accessToken) {
            clearSession()
        }
        return readApiResponse<T>(retry)
    }

    return { admin, isLoggedIn, restoreSession, login, logout, request }
})
