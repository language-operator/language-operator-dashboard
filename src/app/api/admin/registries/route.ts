import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'

const OPERATOR_NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'
const CONFIG_MAP_NAME = 'language-operator-config'
const REGISTRIES_KEY = 'allowed-registries'

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request)
    const client = k8sClient

    try {
      const configMapResponse = await client.readConfigMap(OPERATOR_NAMESPACE, CONFIG_MAP_NAME)

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
    } catch (k8sError) {
      console.error('Error reading ConfigMap:', k8sError)

      if ((k8sError as { code?: number }).code === 404) {
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
    await getAuthenticatedUser(request)
    const client = k8sClient

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

    try {
      // Try to read existing ConfigMap first
      let configMapExists = true
      let existingConfigMap: Awaited<ReturnType<typeof client.readConfigMap>> | undefined

      try {
        existingConfigMap = await client.readConfigMap(OPERATOR_NAMESPACE, CONFIG_MAP_NAME)
      } catch (error) {
        if ((error as { code?: number }).code === 404) {
          configMapExists = false
        } else {
          throw error
        }
      }

      if (configMapExists && existingConfigMap) {
        // Update existing ConfigMap
        const updatedConfigMap = {
          ...existingConfigMap,
          data: {
            ...existingConfigMap.data,
            [REGISTRIES_KEY]: registriesData
          }
        }

        await client.replaceConfigMap(OPERATOR_NAMESPACE, CONFIG_MAP_NAME, updatedConfigMap)
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

        await client.createConfigMap(OPERATOR_NAMESPACE, newConfigMap)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Registry configuration updated successfully' 
      })
    } catch (k8sError) {
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