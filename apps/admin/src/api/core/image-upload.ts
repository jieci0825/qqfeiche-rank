import { useAuthStore } from '@/stores/auth'
import type { AdminApiPath } from './client'
import { ApiError } from './errors'

export async function uploadImage(path: AdminApiPath, label: string, file: File, signal: AbortSignal) {
    const { uploadUrl, fields, ticket } = await useAuthStore().request<{
        uploadUrl: string
        fields: Record<string, string>
        ticket: string
    }>(path, {
        method: 'POST',
        body: { size: file.size, contentType: file.type, originalName: file.name },
        signal,
    })

    const form = new FormData()
    for (const [name, value] of Object.entries(fields)) form.append(name, value)
    form.append('file', file)

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    }).catch(() => {
        signal.throwIfAborted()
        throw new ApiError(0, 'COS_UPLOAD_FAILED', '连接 COS 失败，请稍后重试', 0)
    })
    if (!response.ok) {
        throw new ApiError(response.status, 'COS_UPLOAD_FAILED', `上传${label}失败，请重新提交`, 0)
    }
    return ticket
}
