// Seed a demo user (demo@studio.com / demo1234) into MongoDB.
// Usage: MONGODB_URI=mongodb://... node scripts/seed-user.mjs
import { randomBytes, scrypt } from 'node:crypto'
import mongoose from 'mongoose'

const SCRYPT_KEY_LENGTH = 64
const DEMO_EMAIL = 'demo@studio.com'
const DEMO_PASSWORD = 'demo1234'
const DEMO_NAME = 'Demo Owner'

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derived) => {
      if (err) reject(err)
      else resolve(`${salt.toString('hex')}:${derived.toString('hex')}`)
    })
  })
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set')
    process.exit(1)
  }

  await mongoose.connect(uri)

  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const result = await mongoose.connection.collection('users').updateOne(
    { email: DEMO_EMAIL },
    {
      $set: {
        email: DEMO_EMAIL,
        passwordHash,
        name: DEMO_NAME,
        role: 'owner',
        agencyId: 'agency-1',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  )

  console.log(
    result.upsertedCount > 0
      ? `Created user ${DEMO_EMAIL}`
      : `Updated user ${DEMO_EMAIL}`,
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
