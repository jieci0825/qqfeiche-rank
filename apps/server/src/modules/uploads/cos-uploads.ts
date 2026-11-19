import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import COS from 'cos-nodejs-sdk-v5'
import type { CosConfig } from '../../config.ts'
import { HttpError } from '../../http/errors.ts'

interface UploadFile {
    contentType: string
    extension: string
    size: number
    originalName: string | null
}

interface UploadGrant {
    key: string
    contentType: string
    size: number
    originalName?: string | null
    expiresAt: number
}

const uploadLifetimeSeconds = 5 * 60
const ticketPattern = /^([\w-]+)\.([\w-]{43})$/

export function createCosUploads({ secretId, secretKey, bucket, region, publicBaseUrl }: CosConfig) {
    const uploadUrl = `https://${bucket}.cos.${region}.myqcloud.com/`

    function signTicket(payload: string, directory: string, adminId: number) {
        return createHmac('sha256', secretKey)
            .update(JSON.stringify(['cos-upload-confirmation', bucket, region, directory, adminId, payload]))
            .digest('base64url')
    }

    return {
        publicUrl(key: string) {
            return new URL(key, publicBaseUrl).href
        },

        signUpload(directory: string, adminId: number, { contentType, extension, size, originalName }: UploadFile) {
            const now = Math.floor(Date.now() / 1000)
            const expiresAt = now + uploadLifetimeSeconds
            const key = `qqfeiche/${directory}/${randomUUID()}.${extension}`
            const keyTime = `${now};${expiresAt}`
            const restrictions = {
                key,
                acl: 'default',
                'Content-Type': contentType,
                'x-cos-forbid-overwrite': 'true',
                'q-sign-algorithm': 'sha1',
                'q-ak': secretId,
            }
            // COS POST policies use q-sign-time in the policy and q-key-time in the form.
            const policy = JSON.stringify({
                expiration: new Date(expiresAt * 1000).toISOString(),
                conditions: [
                    { bucket },
                    ...Object.entries(restrictions).map(([name, value]) => ({ [name]: value })),
                    { 'q-sign-time': keyTime },
                    ['content-length-range', 1, size],
                ],
            })
            const signKey = createHmac('sha1', secretKey).update(keyTime).digest('hex')
            const policyHash = createHash('sha1').update(policy).digest('hex')
            const fields = {
                ...restrictions,
                'q-key-time': keyTime,
                'q-signature': createHmac('sha1', signKey).update(policyHash).digest('hex'),
                policy: Buffer.from(policy).toString('base64'),
            }
            const grant: UploadGrant = { key, contentType, size, originalName, expiresAt }
            const payload = Buffer.from(JSON.stringify(grant)).toString('base64url')
            return { uploadUrl, fields, ticket: `${payload}.${signTicket(payload, directory, adminId)}` }
        },

        async readUploadHeader(directory: string, adminId: number, ticket: unknown, headerSize: number) {
            const match = typeof ticket === 'string' ? ticketPattern.exec(ticket) : null
            if (!match || !timingSafeEqual(Buffer.from(match[2]), Buffer.from(signTicket(match[1], directory, adminId)))) {
                throw new HttpError(400, 'INVALID_UPLOAD_TICKET', '上传凭证无效，请重新选择文件')
            }

            const { key, contentType, size, originalName, expiresAt } = JSON.parse(
                Buffer.from(match[1], 'base64url').toString('utf8'),
            ) as UploadGrant
            if (expiresAt * 1000 <= Date.now()) {
                throw new HttpError(409, 'UPLOAD_EXPIRED', '上传凭证已过期，请重新选择文件')
            }

            const end = Math.min(headerSize, size) - 1
            const range = `bytes=0-${end}`
            const authorization = COS.getAuthorization({
                SecretId: secretId,
                SecretKey: secretKey,
                Bucket: bucket,
                Region: region,
                Method: 'GET',
                Key: key,
                Headers: { Range: range },
                Expires: 30,
            })
            try {
                // The ranged response includes the full object size in Content-Range.
                const response = await fetch(new URL(key, uploadUrl), {
                    headers: { authorization, range, 'accept-encoding': 'identity' },
                    redirect: 'error',
                    signal: AbortSignal.timeout(10_000),
                })
                if (response.status !== 206) {
                    await response.body?.cancel()
                    if (response.status === 404) {
                        throw new HttpError(409, 'UPLOAD_NOT_FOUND', '未找到已上传的文件，请重试')
                    }
                    throw new HttpError(502, 'COS_REQUEST_FAILED', '暂时无法确认上传，请稍后重试')
                }
                if (
                    response.headers.get('content-type') !== contentType ||
                    response.headers.get('content-range') !== `bytes 0-${end}/${size}`
                ) {
                    await response.body?.cancel()
                    throw new HttpError(422, 'UPLOAD_METADATA_MISMATCH', '上传文件的大小或类型与申请信息不符')
                }
                const header = Buffer.from(await response.arrayBuffer())
                if (header.length !== end + 1) {
                    throw new HttpError(502, 'COS_REQUEST_FAILED', '暂时无法确认上传，请稍后重试')
                }
                return { header, file: { objectKey: key, contentType, sizeBytes: size, originalName: originalName ?? null } }
            } catch (error) {
                if (error instanceof HttpError) throw error
                throw new HttpError(502, 'COS_REQUEST_FAILED', '暂时无法确认上传，请稍后重试')
            }
        },
    }
}

export type CosUploads = ReturnType<typeof createCosUploads>
