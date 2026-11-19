export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly retryAfter: number,
    ) {
        super(message)
    }
}

export function apiErrorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : '连接服务失败，请稍后重试'
}
