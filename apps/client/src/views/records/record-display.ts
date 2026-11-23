const hourMs = 3_600_000
const dayMs = 24 * hourMs
const dateTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short',
})
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', dateStyle: 'short' })

export const trackDistanceLabels = { short: '短图', medium: '中图', long: '长图' }

export function trackDistance(timeMs: number) {
    if (timeMs <= 60_000) return 'short'
    if (timeMs <= 85_000) return 'medium'
    return 'long'
}

export function formatRecordTime(timeMs: number) {
    const hundredths = Math.trunc(timeMs / 10)
    const minutes = Math.floor(hundredths / 6000)
    const seconds = String(Math.floor(hundredths / 100) % 60).padStart(2, '0')
    return `${minutes}:${seconds}.${String(hundredths % 100).padStart(2, '0')}`
}

export function formatHoldingTime(durationMs: number) {
    const days = Math.floor(durationMs / dayMs)
    const hours = Math.floor(durationMs / hourMs) % 24
    if (days) return `${days} 天 ${hours} 小时`
    if (hours) return `${hours} 小时`
    const minutes = Math.floor(durationMs / 60_000)
    return minutes ? `${minutes} 分钟` : '不足 1 分钟'
}

export function formatRecordDateTime(value: string) {
    return dateTime.format(new Date(value))
}

export function formatRecordDate(value: string) {
    return date.format(new Date(value))
}
