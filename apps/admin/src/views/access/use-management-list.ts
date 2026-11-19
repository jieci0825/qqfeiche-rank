import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { apiErrorMessage } from '@/api'

export function useManagementList<T>(fetchItems: (signal: AbortSignal) => Promise<T[]>, immediate = true) {
    const items = shallowRef<T[]>([])
    const loading = ref(immediate)
    const error = ref('')
    let currentRequest: AbortController | undefined
    let disposed = false

    async function load() {
        if (disposed) return
        currentRequest?.abort()
        const request = new AbortController()
        currentRequest = request
        loading.value = true
        error.value = ''
        try {
            const result = await fetchItems(request.signal)
            if (!request.signal.aborted) items.value = result
        } catch (cause) {
            if (!request.signal.aborted) error.value = apiErrorMessage(cause)
        } finally {
            if (currentRequest === request) {
                currentRequest = undefined
                loading.value = false
            }
        }
    }

    if (immediate) onMounted(load)
    onBeforeUnmount(() => {
        disposed = true
        currentRequest?.abort()
    })

    return { items, loading, error, load }
}
