import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

const repoRoot = join(import.meta.dirname, '..')
const configPath = join(repoRoot, '.env.deploy.local')
const clientUrl = 'https://feiche.coderjc.cn'
const adminUrl = 'http://feiche-admin.coderjc.cn'
const usage = '用法：pnpm deploy:prod 或 pnpm deploy:prod --rollback <版本>'

function run(command, args, { input, label } = {}) {
    const started = performance.now()
    if (label) console.log(`开始${label}`)
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        input,
        stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
        throw new Error(`${command} 执行失败（${result.signal ?? `退出码 ${result.status}`}）`)
    }
    if (label) console.log(`${label}完成（${((performance.now() - started) / 1_000).toFixed(1)} 秒）`)
}

async function verifySites(release, expectedPages) {
    const pages = [
        ['用户端页面', `${clientUrl}/?deploy=${release}`],
        ['管理端页面', `${adminUrl}/?deploy=${release}`],
    ].map(([name, url], index) => [name, url, async response => {
        const html = await response.text()
        if (expectedPages) return html === expectedPages[index]
        return Boolean(html && response.headers.get('content-type')?.includes('text/html'))
    }])
    const checks = [
        ...pages,
        ['API 健康检查', `${clientUrl}/api/health`, async response => (await response.json()).status === 'ok'],
        ['榜单记录查询', `${clientUrl}/api/public/records?page=1`, async response => Array.isArray((await response.json()).items)],
    ]
    const deadline = Date.now() + 75_000

    for (;;) {
        const results = await Promise.allSettled(checks.map(async ([, url, verify]) => {
            const response = await fetch(url, {
                headers: { 'Cache-Control': 'no-cache' },
                signal: AbortSignal.timeout(8_000),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            if (!await verify(response)) throw new Error('响应内容与预期不符')
        }))
        if (results.every(result => result.status === 'fulfilled')) return
        if (Date.now() >= deadline) {
            const details = results.flatMap((result, index) =>
                result.status === 'rejected' ? [`${checks[index][0]}（${result.reason.message}）`] : []
            )
            throw new Error(`容器已切换，公网检查失败：${details.join('、')}`)
        }
        await delay(3_000)
    }
}

async function main() {
    const args = process.argv.slice(2)
    if (args.length === 1 && args[0] === '--help') {
        console.log(usage)
        return
    }

    const isDeploy = args.length === 0
    if (!isDeploy && (args.length !== 2 || args[0] !== '--rollback' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(args[1]))) {
        throw new Error(usage)
    }
    if (existsSync(configPath)) loadEnvFile(configPath)

    const { DEPLOY_HOST: host = '', DEPLOY_SSH_KEY: key, DEPLOY_DIR: dir = '/opt/apps/qqfeiche-rank' } = process.env
    if (!/^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(host)) {
        throw new Error('请在 .env.deploy.local 中设置 DEPLOY_HOST（SSH 地址或别名）')
    }
    if (!/^\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(dir) || dir.split('/').some(part => part === '..' || part === '.')) {
        throw new Error('DEPLOY_DIR 必须是仅含字母、数字、点、下划线或连字符的绝对路径')
    }

    const sshOptions = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10']
    if (key) sshOptions.push('-i', key.startsWith('~/') ? join(homedir(), key.slice(2)) : key, '-o', 'IdentitiesOnly=yes')
    const activateRelease = readFileSync(join(repoRoot, 'deploy/activate-release.sh'))
    const release = isDeploy ? `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}` : args[1]
    const targets = [
        { stage: 'frontend', image: `qqfeiche-rank-nginx:${release}`, name: 'Nginx' },
        { stage: 'api', image: `qqfeiche-rank-api:${release}`, name: 'API' },
    ]
    const images = targets.map(target => target.image)
    console.log(`${isDeploy ? '发布' : '回滚到'} ${release}`)

    let expectedPages
    if (isDeploy) {
        run('pnpm', ['install', '--frozen-lockfile'], { label: '安装本地依赖' })
        run('pnpm', ['build'], { label: '构建两套前端' })
        expectedPages = ['client', 'admin'].map(app => readFileSync(join(repoRoot, 'apps', app, 'dist/index.html'), 'utf8'))
        for (const { stage, image, name } of targets) {
            run('docker', ['buildx', 'build', '--platform', 'linux/amd64', '--target', stage, '--load', '--tag', image, '.'],
                { label: `在本地构建 ${name} 镜像` })
        }

        const workDir = mkdtempSync(join(tmpdir(), 'qqfeiche-rank-'))
        const remoteDir = `${dir}/.releases/${release}`
        try {
            const archive = join(workDir, 'images.tar')
            run('docker', ['image', 'save', '-o', archive, ...images], { label: '导出本地镜像' })
            run('gzip', ['-1', archive], { label: '压缩镜像归档' })
            run('ssh', [...sshOptions, host, `umask 077; mkdir -p -- '${dir}/.releases' && mkdir -- '${remoteDir}'`])
            try {
                run('scp', [...sshOptions, `${archive}.gz`, 'compose.yaml', `${host}:${remoteDir}/`], { label: '上传镜像和 Compose 配置' })
            } catch (error) {
                try {
                    run('ssh', [...sshOptions, host, `rm -f -- '${remoteDir}/images.tar.gz' '${remoteDir}/compose.yaml' && rmdir -- '${remoteDir}'`])
                } catch {
                    console.error(`请检查服务器上的临时上传目录：${remoteDir}`)
                }
                throw error
            }
        } finally {
            rmSync(workDir, { recursive: true, force: true })
        }
    }

    run('ssh', [...sshOptions, host, `bash -s -- '${dir}' '${release}' '${isDeploy ? 'deploy' : 'rollback'}'`], { input: activateRelease })
    console.log('开始通过公共域名检查站点、API 和榜单记录')
    await verifySites(release, expectedPages)
    try {
        run('ssh', [...sshOptions, host, `test "$(readlink '${dir}/.releases/current')" = '${release}'`])
    } catch (error) {
        throw new Error(`公网检查通过，但无法确认服务器仍在运行 ${release}：${error.message}`)
    }
    console.log(`${release} 已上线，用户端、管理端、API 和榜单记录查询均通过检查。`)

    if (isDeploy) {
        try {
            run('docker', ['image', 'rm', '--no-prune', ...images], { label: '清理本次发布的本地镜像' })
        } catch (error) {
            console.warn(`${release} 已上线，本地镜像清理未完全成功。${error.message}`)
        }
    }
}

main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
})
