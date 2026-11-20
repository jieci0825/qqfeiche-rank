import type Koa from 'koa'
import { HttpError } from '../../http/errors.ts'
import { readJsonObject } from '../../http/json-body.ts'
import type { CosUploads } from './cos-uploads.ts'

export interface ImageUploadPurpose {
    directory: string
    label: string
    errorPrefix?: 'COVER'
}

const maxImageBytes = 5 * 1024 * 1024
const imageExtensions = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
])
const jpegHeader = Buffer.from('ffd8ff', 'hex')
const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex')

export async function signImageUpload(ctx: Koa.Context, adminId: number, purpose: ImageUploadPurpose, uploads?: CosUploads) {
    const { directory, label, errorPrefix = 'IMAGE' } = purpose
    if (!uploads) throw new HttpError(503, 'COS_NOT_CONFIGURED', `${label}上传服务尚未配置`)

    const body = await readJsonObject(ctx)
    const { size, originalName } = body
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1 || size > maxImageBytes) {
        throw new HttpError(400, `INVALID_${errorPrefix}_SIZE`, `${label}须大于 0 字节且不超过 5 MB`)
    }
    const contentType = typeof body.contentType === 'string' ? body.contentType : ''
    const extension = imageExtensions.get(contentType)
    if (!extension) {
        throw new HttpError(400, `INVALID_${errorPrefix}_TYPE`, '请选择 JPEG、PNG 或 WebP 图片')
    }
    if (
        originalName !== undefined &&
        (typeof originalName !== 'string' || !originalName.trim() || originalName.length > 255 ||
            /[\u0000\r\n]/.test(originalName))
    ) {
        throw new HttpError(400, `INVALID_${errorPrefix}_NAME`, '文件名须为 1 至 255 个字符且不能包含换行')
    }
    return uploads.signUpload(directory, adminId, { contentType, extension, size, originalName: originalName ?? null })
}

export async function confirmImageUpload(ticket: unknown, adminId: number, purpose: ImageUploadPurpose, uploads?: CosUploads) {
    const { directory, label, errorPrefix = 'IMAGE' } = purpose
    if (!uploads) throw new HttpError(503, 'COS_NOT_CONFIGURED', `${label}上传服务尚未配置`)

    const { header, file } = await uploads.readUploadHeader(directory, adminId, ticket, 12)
    if (!matchesImageHeader(header, file.contentType)) {
        throw new HttpError(422, `INVALID_${errorPrefix}_CONTENT`, '文件内容与所选图片格式不符')
    }
    return file
}

function matchesImageHeader(header: Buffer, contentType: string): boolean {
    if (contentType === 'image/jpeg') return header.subarray(0, jpegHeader.length).equals(jpegHeader)
    if (contentType === 'image/png') return header.subarray(0, pngHeader.length).equals(pngHeader)
    return contentType === 'image/webp' && header.toString('latin1', 0, 4) === 'RIFF' &&
        header.toString('latin1', 8, 12) === 'WEBP'
}
