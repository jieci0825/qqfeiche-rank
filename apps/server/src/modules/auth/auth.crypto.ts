import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const scryptOptions = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const passwordHashPattern = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/
const dummySalt = Buffer.alloc(16)
const dummyHash = Buffer.alloc(64)

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, scryptOptions, (error, key) => {
            if (error) reject(error)
            else resolve(key)
        })
    })
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16)
    const key = await deriveKey(password, salt)
    return `scrypt-v1$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
    const parts = storedHash?.match(passwordHashPattern)
    const salt = parts ? Buffer.from(parts[1], 'hex') : dummySalt
    const expected = parts ? Buffer.from(parts[2], 'hex') : dummyHash
    const actual = await deriveKey(password, salt)
    return timingSafeEqual(actual, expected) && Boolean(parts)
}

export function issueToken(): string {
    return randomBytes(32).toString('base64url')
}

export function isToken(value: string | undefined): value is string {
    return value !== undefined && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}
