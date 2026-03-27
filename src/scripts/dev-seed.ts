#!/usr/bin/env npx tsx

/**
 * Development seed script
 *
 * Creates the default admin user for local development.
 * Only runs if the database is empty (no users exist).
 *
 * Usage: npm run dev:seed
 */

import bcrypt from 'bcryptjs'
import { db } from '../lib/db'

const DEV_ADMIN = {
  name: 'Development Admin',
  email: 'james@theryans.io',
  password: 'password123' // Plain text - will be hashed
}

async function seedDevDatabase() {
  console.log('🌱 [DEV-SEED] Seeding development database...')

  try {
    // Check if any users already exist
    const userCount = await db.user.count()

    if (userCount > 0) {
      console.log(`ℹ️ [DEV-SEED] Database already has ${userCount} users, skipping seed`)
      return false
    }

    console.log('🔐 [DEV-SEED] Hashing development password...')
    const passwordHash = await bcrypt.hash(DEV_ADMIN.password, 12)

    const user = await db.user.create({
      data: {
        name: DEV_ADMIN.name,
        email: DEV_ADMIN.email,
        password: passwordHash,
        emailVerified: new Date(),
      }
    })

    console.log(`👤 [DEV-SEED] Created development admin user: ${user.email}`)
    console.log('✅ [DEV-SEED] Development database seeded successfully!')
    console.log(`🔑 [DEV-SEED] Login credentials: ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`)

    return true

  } catch (error) {
    console.error('❌ [DEV-SEED] Failed to seed development database:', error)
    throw error
  }
}

async function main() {
  try {
    await seedDevDatabase()
    process.exit(0)
  } catch (error) {
    console.error('💥 [DEV-SEED] Seed script failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { seedDevDatabase }
