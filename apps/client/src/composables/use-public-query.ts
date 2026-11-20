import { shallowRef, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

export function usePublicQuery<Query, Result>(query: MaybeRefOrGetter<Query>, load: (query: Query, signal: AbortSignal) => Promise<Result>) {
    const data = shallowRef<Result | null>(null)
    const error = shallowRef<unknown>(null)
    const loading = ref(true)
    const revision = ref(0)

    watch([() => toValue(query), revision], async ([value], _, onCleanup) => {
        const controller = new AbortController()
        const { signal } = controller
        onCleanup(() => controller.abort())

        data.value = null
        error.value = null
        loading.value = true
        try {
            const result = await load(value, signal)
            if (!signal.aborted) data.value = result
        } catch (failure) {
            if (!signal.aborted) error.value = failure
        } finally {
            if (!signal.aborted) loading.value = false
        }
    }, { immediate: true })

    return { data, error, loading, retry: () => { revision.value++ } }
}
