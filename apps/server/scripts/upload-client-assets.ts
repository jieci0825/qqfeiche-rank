import { readdir, readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import COS from 'cos-nodejs-sdk-v5'
import { loadCosConfig } from '../src/config.ts'
import { clientAssetPrefix } from '../src/modules/public/client-assets.ts'

async function main() {
    const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' } } })
    const config = loadCosConfig(process.env)
    if (!config) throw new Error('请在 apps/server/.env 配置 COS 后再执行上传命令')

    const directory = new URL(`../../client/public/${clientAssetPrefix}`, import.meta.url)
    const entries = await readdir(directory, { withFileTypes: true })
    const files = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.webp'))
        .map(entry => entry.name)
        .sort()
    if (!files.length) throw new Error('客户端素材目录中没有 WebP 文件')

    console.log(`COS 目标目录：${config.bucket}/${clientAssetPrefix}`)
    console.log(`访问地址前缀：${new URL(clientAssetPrefix, config.publicBaseUrl).href}`)

    if (values['dry-run']) {
        for (const file of files) console.log(`待上传 ${clientAssetPrefix}${file}`)
        console.log(`共 ${files.length} 张图片，预览完成。`)
        return
    }

    const cos = new COS({ SecretId: config.secretId, SecretKey: config.secretKey })
    for (const file of files) {
        const key = `${clientAssetPrefix}${file}`
        const body = await readFile(new URL(encodeURIComponent(file), directory))

        try {
            await cos.putObject({
                Bucket: config.bucket,
                Region: config.region,
                Key: key,
                Body: body,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=300',
            })
        } catch (error) {
            const detail = error as COS.CosError
            const reason = [detail?.statusCode, detail?.code].filter(Boolean).join(' ')
            throw new Error(`上传 ${key} 失败${reason ? `（${reason}）` : ''}`)
        }
        console.log(`已上传 ${key}`)
    }
    console.log(`已上传 ${files.length} 张图片。`)
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : '上传客户端素材失败')
    process.exitCode = 1
})
