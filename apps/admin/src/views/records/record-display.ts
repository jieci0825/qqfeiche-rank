import type { RecordState, RecordVoidReason } from '@/api'

export const recordStateLabels: Record<RecordState, string> = {
    current: '当前', historical: '历史', voided: '已作废',
}

export const recordVoidReasonLabels: Record<RecordVoidReason, string> = {
    bug: '游戏漏洞', reset: '卡复位', cheat: '外挂或第三方工具',
    boost: '代跑或借号', mistake: '录入错误', other: '其他',
}

const beijingDateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23',
})

export function formatRecordDate(value: string | null) {
    return value ? beijingDateTime.format(new Date(value)) : '—'
}

export function formatRecordTime(timeMs: number) {
    const minutes = Math.floor(timeMs / 60000)
    const seconds = String(Math.floor(timeMs / 1000) % 60).padStart(2, '0')
    const hundredths = String(Math.floor(timeMs / 10) % 100).padStart(2, '0')
    return `${minutes}:${seconds}.${hundredths}`
}
