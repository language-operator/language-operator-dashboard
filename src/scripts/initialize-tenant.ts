#!/usr/bin/env npx tsx

/**
 * Tenant initialization script
 *
 * This script runs as a Kubernetes Job after Helm install/upgrade
 * to set up the initial admin user when LANGOP_INIT_* environment
 * variables are provided by the CLI.
 *
 * Usage: npm run initialize-tenant
 */

import { db } from '../lib/db'

async function performInitialSetup(): Promise<boolean> {
  const adminName = process.env.LANGOP_INIT_ADMIN_NAME
  const adminEmail = process.env.LANGOP_INIT_ADMIN_EMAIL
  const adminPasswordHash = process.env.LANGOP_INIT_ADMIN_PASSWORD_HASH

  if (!adminName || !adminEmail || !adminPasswordHash) {
    console.log('ℹ️ [TENANT-INIT] No LANGOP_INIT_* environment variables found, skipping setup')
    return false
  }

  const userCount = await db.user.count()
  if (userCount > 0) {
    console.log(`⏭️ [TENANT-INIT] Database not empty (${userCount} users), skipping setup`)
    return false
  }

  console.log(`👤 [TENANT-INIT] Creating admin user: ${adminEmail}`)

  await db.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: adminPasswordHash,
      emailVerified: new Date(),
    }
  })

  console.log('🎉 [TENANT-INIT] Admin user created successfully')
  return true
}

async function main() {
  console.log('🚀 [TENANT-INIT] Starting tenant initialization...')

  try {
    const setupPerformed = await performInitialSetup()

    if (setupPerformed) {
      console.log('✅ [TENANT-INIT] Tenant initialization completed successfully')
      process.exit(0)
    } else {
      console.log('ℹ️ [TENANT-INIT] No initialization needed')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ [TENANT-INIT] Tenant initialization failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { main }
