import type Koa from 'koa'
import { HttpError } from './errors.ts'

const maxJsonBytes = 8 * 1024

export async function readJsonObject(ctx: Koa.Context): Promise<Record<string, unknown>> {
    const encoding = ctx.get('content-encoding')
    if (ctx.request.type !== 'application/json' || (encoding && encoding.toLowerCase() !== 'identity')) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', '请提交未压缩的 application/json 请求')
    }

    const chunks: Buffer[] = []
    let size = 0
    if ((ctx.request.length ?? 0) > maxJsonBytes) rejectOversize(ctx)
    for await (const chunk of ctx.req.iterator({ destroyOnReturn: false })) {
        size += chunk.length
        if (size > maxJsonBytes) rejectOversize(ctx)
        chunks.push(chunk)
    }

    let body: unknown
    try {
        body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)))
    } catch {
        throw new HttpError(400, 'INVALID_JSON', '请求体不是有效的 UTF-8 JSON')
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new HttpError(400, 'INVALID_JSON', '请求体必须是 JSON 对象')
    }
    return body as Record<string, unknown>
}

function rejectOversize(ctx: Koa.Context): never {
    ctx.set('Connection', 'close')
    throw new HttpError(413, 'BODY_TOO_LARGE', '请求体超过大小限制')
}
