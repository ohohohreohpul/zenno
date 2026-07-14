import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto'

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

const SCRYPT_KEY_LENGTH = 64
const SALT_BYTES = 16

// Dev-only fallback; set AUTH_SECRET in production.
const DEV_FALLBACK_SECRET = 'dev-secret-change-me'

export const MOCK_DEMO_USER = {
  userId: 'user-demo-1',
  email: 'demo@studio.com',
  password: 'demo1234',
  name: 'Demo Owner',
} as const

export interface SessionPayload {
  userId: string
  email: string
  name: string
}

interface SessionClaims extends SessionPayload {
  exp: number
}

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production')
  return DEV_FALLBACK_SECRET
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derived) => {
      if (err) reject(err)
      else resolve(derived)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scryptAsync(password, salt)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const derived = await scryptAsync(password, Buffer.from(saltHex, 'hex'))
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', getAuthSecret()).update(encodedPayload).digest('base64url')
}

export function createSessionToken(payload: SessionPayload): string {
  const claims: SessionClaims = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${encoded}.${signPayload(encoded)}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expected = Buffer.from(signPayload(encoded))
  const provided = Buffer.from(signature)
  if (expected.length !== provided.length) return null
  if (!timingSafeEqual(expected, provided)) return null

  try {
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionClaims
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null
    if (!claims.userId || !claims.email || !claims.name) return null
    return { userId: claims.userId, email: claims.email, name: claims.name }
  } catch {
    return null
  }
}
