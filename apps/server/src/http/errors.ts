import type Koa from 'koa'

export class HttpError extends Error {
    readonly status: number
    readonly code: string

    constructor(status: number, code: string, message: string) {
        super(message)
        this.status = status
        this.code = code
    }
}

export const handleErrors: Koa.Middleware = async (ctx, next) => {
    try {
        await next()
    } catch (error) {
        if (error instanceof HttpError) {
            ctx.status = error.status
            ctx.body = { code: error.code, message: error.message }
            return
        }

        ctx.app.emit('error', error, ctx)
        ctx.status = 500
        ctx.body = { code: 'INTERNAL_ERROR', message: '服务暂时不可用' }
    }
}
