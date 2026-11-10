import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'

const app = Fastify({ logger: true })
const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '127.0.0.1'

const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url))
const adminDist = fileURLToPath(new URL('../../admin/dist', import.meta.url))
const clientIndex = join(clientDist, 'index.html')
const adminIndex = join(adminDist, 'index.html')
const clientReady = existsSync(clientIndex)
const adminReady = existsSync(adminIndex)

app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
}))

if (clientReady) {
    await app.register(fastifyStatic, { root: clientDist })
}

if (adminReady) {
    await app.register(fastifyStatic, {
        root: adminDist,
        prefix: '/admin/',
        decorateReply: false,
    })
}

app.setNotFoundHandler(async (request, reply) => {
    if (request.method !== 'GET' || request.url.startsWith('/api/')) {
        return reply.code(404).send({ message: 'Not Found' })
    }

    if (request.url === '/admin') {
        return reply.redirect('/admin/')
    }

    if (request.url.startsWith('/admin/')) {
        if (!adminReady) {
            return reply.code(404).send({ message: 'Admin app is not built' })
        }

        return reply.type('text/html').send(await readFile(adminIndex))
    }

    if (!clientReady) {
        return reply.code(404).send({ message: 'Client app is not built' })
    }

    return reply.type('text/html').send(await readFile(clientIndex))
})

try {
    await app.listen({ port, host })
} catch (error) {
    app.log.error(error)
    process.exit(1)
}
