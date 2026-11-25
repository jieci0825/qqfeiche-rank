import { shallowRef } from 'vue'
import { requestApi } from '../core/client'

const localImageBase = `${import.meta.env.BASE_URL}qqfeiche/assets/client/`
const imageBase = shallowRef<string>()

export async function loadClientAssetBase() {
    try {
        const { baseUrl } = await requestApi<{ baseUrl: string | null }>(
            '/api/public/client-assets',
            {
                signal: AbortSignal.timeout(3000),
            }
        )
        imageBase.value = baseUrl ?? localImageBase
    } catch {
        imageBase.value = localImageBase
    }
}

export function clientImageUrl(name: string) {
    return imageBase.value
        ? `${imageBase.value}${encodeURIComponent(name)}.webp`
        : undefined
}

export function clientBackgroundImage(name: string) {
    const url = clientImageUrl(name)
    return url ? `url("${url}")` : 'none'
}
