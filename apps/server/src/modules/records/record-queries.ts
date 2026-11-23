// 现有成绩保存日期，旧版成绩可能保存 UTC 时间戳。
export function recordAchievedDate(achievedAtColumn: string) {
    return `date(${achievedAtColumn}, '+8 hours')`
}

export const millisecondsPerDay = 86_400_000

export function recordHoldingMs(achievedAt: string, endMs: number) {
    const startMs = Date.parse(`${achievedAt}T00:00:00+08:00`)
    return Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0
}

// 参数是调用方固定的 SQL 表达式，查询值仍通过预编译语句绑定。
export function latestValidVersionId(trackId: string, excludedRunId?: string) {
    const exclusion = excludedRunId === undefined ? '' : `AND candidate.id IS NOT ${excludedRunId}`
    return `(
        SELECT version.id FROM record_versions AS version
        JOIN runs AS candidate ON candidate.id = version.run_id
        WHERE version.track_id = ${trackId} AND candidate.status = 'valid' ${exclusion}
        ORDER BY version.id DESC LIMIT 1
    )`
}
