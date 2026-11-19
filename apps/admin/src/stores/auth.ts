import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
    ApiError,
    authContextPath,
    postAuth,
    requestApi,
    type AdminApiPath,
    type AdminContext,
    type AdminSession,
    type ApiOptions,
    type Credentials,
} from '@/api'

export const useAuthStore = defineStore('auth', () => {
    const session = shallowRef<AdminSession | null>(null)
    const context = shallowRef<AdminContext | null>(null)
    const menus = computed(() => context.value?.menus ?? null)
    const roles = computed(() => context.value?.roles ?? [])
    const permissions = computed(() => new Set(context.value?.permissions))
    const admin = computed(() => session.value?.admin ?? null)
    const isLoggedIn = computed(() => session.value !== null)
    let sessionVersion = 0
    let sessionChecked = false
    let pendingLogin: Promise<void> | undefined
    let pendingRefresh: Promise<void> | undefined
    let pendingLogout: Promise<void> | undefined
    let pendingMenus: Promise<void> | undefined

    function setSession(grant: AdminSession | null) {
        sessionVersion++
        session.value = grant
        context.value = null
        pendingMenus = undefined
    }

    function clearSession() {
        setSession(null)
    }

    function refresh() {
        if (!pendingRefresh) {
            pendingRefresh = postAuth<AdminSession>('refresh')
                .then(grant => {
                    // 其他标签页可能已切换账号，旧页面的请求和菜单不能沿用新账号的会话。
                    if (session.value && session.value.admin.id !== grant.admin.id) {
                        clearSession()
                        return
                    }
                    session.value = grant
                })
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
            setSession(grant)
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

        let unauthorizedError: ApiError
        try {
            return await requestApi<T>(path, options, token)
        } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401 || pendingLogout || version !== sessionVersion) {
                throw error
            }
            unauthorizedError = error
        }

        // 较晚返回的 401 可以直接使用已续签的令牌。
        if (token === session.value?.accessToken) await refresh()
        const retryToken = session.value?.accessToken
        if (!retryToken || pendingLogout || version !== sessionVersion) {
            throw unauthorizedError
        }

        try {
            return await requestApi<T>(path, options, retryToken)
        } catch (error) {
            if (error instanceof ApiError && error.status === 401 && !pendingRefresh && !pendingLogout
                && retryToken === session.value?.accessToken) {
                clearSession()
            }
            throw error
        }
    }

    function can(permission: string) {
        return permissions.value.has(permission)
    }

    async function loadMenus(force = false) {
        if (pendingMenus) return pendingMenus
        if (!force && context.value !== null) return

        const version = sessionVersion
        pendingMenus = request<AdminContext>(authContextPath, { signal: AbortSignal.timeout(15_000) })
            .then(access => {
                if (version !== sessionVersion || pendingLogout || !session.value) return
                session.value = { ...session.value, admin: access.admin }
                context.value = access
            })
            .finally(() => {
                if (version === sessionVersion) pendingMenus = undefined
            })
        return pendingMenus
    }

    async function reloadAccess() {
        const version = sessionVersion
        await pendingMenus?.catch(() => undefined)
        if (version === sessionVersion && session.value && !pendingLogout) await loadMenus(true)
    }

    return { admin, isLoggedIn, menus, roles, can, restoreSession, login, logout, request, loadMenus, reloadAccess }
})
