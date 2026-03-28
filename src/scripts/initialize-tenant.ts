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

import * as k8s from '@kubernetes/client-node'
import { db } from '../lib/db'

async function createClusterRoleBinding(email: string): Promise<void> {
  const kc = new k8s.KubeConfig()

  if (process.env.KUBERNETES_SERVER_URL && process.env.KUBERNETES_TOKEN) {
    kc.loadFromOptions({
      clusters: [{ name: 'cluster', server: process.env.KUBERNETES_SERVER_URL, skipTLSVerify: process.env.KUBERNETES_SKIP_TLS_VERIFY === 'true' }],
      users: [{ name: 'user', token: process.env.KUBERNETES_TOKEN }],
      contexts: [{ name: 'ctx', user: 'user', cluster: 'cluster' }],
      currentContext: 'ctx',
    })
  } else {
    kc.loadFromCluster()
  }

  const rbacApi = kc.makeApiClient(k8s.RbacAuthorizationV1Api)

  // Binding name: sanitize email to valid k8s name
  const bindingName = `langop-admin-${email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`

  const binding: k8s.V1ClusterRoleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRoleBinding',
    metadata: { name: bindingName },
    subjects: [{ kind: 'User', name: email, apiGroup: 'rbac.authorization.k8s.io' }],
    roleRef: { kind: 'ClusterRole', name: 'langop-admin', apiGroup: 'rbac.authorization.k8s.io' },
  }

  try {
    await rbacApi.createClusterRoleBinding(binding)
    console.log(`🔐 [TENANT-INIT] Created ClusterRoleBinding: ${bindingName}`)
  } catch (err: any) {
    if (err?.response?.statusCode === 409) {
      console.log(`⏭️ [TENANT-INIT] ClusterRoleBinding ${bindingName} already exists, skipping`)
    } else {
      throw err
    }
  }
}

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

  console.log(`🔐 [TENANT-INIT] Creating ClusterRoleBinding for ${adminEmail}`)
  await createClusterRoleBinding(adminEmail)

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
