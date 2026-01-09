import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { k8sClient } from '@/lib/k8s-client'

const OPERATOR_NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'
const CONFIG_MAP_NAME = 'language-operator-config'
const REGISTRIES_KEY = 'allowed-registries'


async function validateAdminAccess(session: any): Promise<boolean> {
  if (!session?.user?.id) {
    return false
  }

  // Check if user has admin access to any organization
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['owner', 'admin'] }
    }
  })

  return !!membership
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!await validateAdminAccess(session)) {
      return NextResponse.json(
        { error: 'Admin privileges required' }, 
        { status: 403 }
      )
    }

    // Use the imported k8sClient instance
    
    try {
      const configMapResponse = await k8sClient.coreV1Api.readNamespacedConfigMap({
        name: CONFIG_MAP_NAME,
        namespace: OPERATOR_NAMESPACE
      })

      const registriesData = configMapResponse.data?.[REGISTRIES_KEY] || ''
      const registryPatterns = registriesData
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      // Convert to registry objects
      const registries = registryPatterns.map((pattern, index) => ({
        id: `registry-${index}`,
        pattern
      }))

      return NextResponse.json({ registries })
    } catch (k8sError: any) {
      console.error('Error reading ConfigMap:', k8sError)
      
      if (k8sError.statusCode === 404) {
        // ConfigMap doesn't exist, return empty list
        return NextResponse.json({ registries: [] })
      }
      
      throw k8sError
    }
  } catch (error) {
    console.error('Error fetching registries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registry configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!await validateAdminAccess(session)) {
      return NextResponse.json(
        { error: 'Admin privileges required' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const { registries } = body

    if (!Array.isArray(registries)) {
      return NextResponse.json(
        { error: 'Invalid request: registries must be an array' },
        { status: 400 }
      )
    }

    // Validate registry patterns
    const invalidPatterns = registries.filter(pattern => !isValidRegistryPattern(pattern))
    if (invalidPatterns.length > 0) {
      return NextResponse.json(
        { error: `Invalid registry patterns: ${invalidPatterns.join(', ')}` },
        { status: 400 }
      )
    }

    const registriesData = registries.sort().join('\n')

    // Use the imported k8sClient instance

    try {
      // Try to read existing ConfigMap first
      let configMapExists = true
      let existingConfigMap: any

      try {
        const response = await k8sClient.coreV1Api.readNamespacedConfigMap({
          name: CONFIG_MAP_NAME,
          namespace: OPERATOR_NAMESPACE
        })
        existingConfigMap = response
      } catch (error: any) {
        if (error.statusCode === 404) {
          configMapExists = false
        } else {
          throw error
        }
      }

      if (configMapExists) {
        // Update existing ConfigMap
        const updatedConfigMap = {
          ...existingConfigMap,
          data: {
            ...existingConfigMap.data,
            [REGISTRIES_KEY]: registriesData
          }
        }

        await k8sClient.coreV1Api.replaceNamespacedConfigMap({
          name: CONFIG_MAP_NAME,
          namespace: OPERATOR_NAMESPACE,
          body: updatedConfigMap
        })
      } else {
        // Create new ConfigMap
        const newConfigMap = {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: CONFIG_MAP_NAME,
            namespace: OPERATOR_NAMESPACE,
            labels: {
              'app.kubernetes.io/name': 'language-operator',
              'app.kubernetes.io/component': 'config'
            }
          },
          data: {
            [REGISTRIES_KEY]: registriesData
          }
        }

        await k8sClient.coreV1Api.createNamespacedConfigMap({
          namespace: OPERATOR_NAMESPACE,
          body: newConfigMap
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Registry configuration updated successfully' 
      })
    } catch (k8sError: any) {
      console.error('Error updating ConfigMap:', k8sError)
      return NextResponse.json(
        { error: 'Failed to update registry configuration' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error updating registries:', error)
    return NextResponse.json(
      { error: 'Failed to update registry configuration' },
      { status: 500 }
    )
  }
}

function isValidRegistryPattern(pattern: string): boolean {
  if (!pattern || pattern.length === 0) return false
  
  // Basic validation for registry patterns
  // Allow: domain.com, subdomain.domain.com, *.domain.com
  const registryRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  
  return registryRegex.test(pattern)
}