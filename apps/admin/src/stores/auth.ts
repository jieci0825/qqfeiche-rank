import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
    const token = ref<string | null>(null)
    const isLoggedIn = computed(() => Boolean(token.value))

    function setToken(value: string | null) {
        token.value = value
    }

    function logout() {
        token.value = null
    }

    return { token, isLoggedIn, setToken, logout }
})
