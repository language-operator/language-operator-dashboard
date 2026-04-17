import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import {
  LanguageAgentRuntime,
  LanguageAgentRuntimeFormData,
  LanguageAgentRuntimeListParams,
  inferRuntimeType,
} from '@/types/runtime'

// GET /api/runtimes — list all LanguageAgentRuntimes (cluster-scoped)
export async function GET(request: NextRequest) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const url = new URL(request.url)
    const params: LanguageAgentRuntimeListParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: (url.searchParams.get('sortBy') as any) || 'name',
      sortOrder: (url.searchParams.get('sortOrder') as any) || 'asc',
      search: url.searchParams.get('search') || undefined,
    }

    let runtimes: LanguageAgentRuntime[] = []

    try {
      const response = await client.listLanguageAgentRuntimes()
      const responseBody = (response as any)?.body
      const responseData = (response as any)?.data
      const responseItems = (response as any)?.items

      if (responseBody?.items && Array.isArray(responseBody.items)) {
        runtimes = responseBody.items
      } else if (responseData?.items && Array.isArray(responseData.items)) {
        runtimes = responseData.items
      } else if (responseItems && Array.isArray(responseItems)) {
        runtimes = responseItems
      } else {
        runtimes = []
      }
    } catch (k8sError) {
      console.error('Error fetching runtimes from Kubernetes:', k8sError instanceof Error ? k8sError.message : String(k8sError))
      runtimes = []
    }

    // Apply search filter
    let filtered = runtimes
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filtered = runtimes.filter((r) =>
        r.metadata.name?.toLowerCase().includes(searchLower) ||
        r.spec.image?.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0
      if (params.sortBy === 'type') {
        cmp = inferRuntimeType(a.spec).localeCompare(inferRuntimeType(b.spec))
      } else if (params.sortBy === 'age') {
        const ta = new Date(a.metadata.creationTimestamp || 0).getTime()
        const tb = new Date(b.metadata.creationTimestamp || 0).getTime()
        cmp = ta - tb
      } else {
        cmp = (a.metadata.name || '').localeCompare(b.metadata.name || '')
      }
      return params.sortOrder === 'desc' ? -cmp : cmp
    })

    // Paginate
    const startIndex = ((params.page || 1) - 1) * (params.limit || 50)
    const paginated = filtered.slice(startIndex, startIndex + (params.limit || 50))

    return NextResponse.json({
      success: true,
      data: paginated,
      total: filtered.length,
      page: params.page || 1,
      limit: params.limit || 50,
    })
  } catch (error) {
    console.error('Error fetching runtimes:', error)
    return NextResponse.json({ error: 'Failed to fetch runtimes' }, { status: 500 })
  }
}

// POST /api/runtimes — create a LanguageAgentRuntime
export async function POST(request: NextRequest) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const formData: LanguageAgentRuntimeFormData = await request.json()

    const spec: Record<string, unknown> = {}

    if (formData.image) spec.image = formData.image

    // Credential configs (only set the matching type)
    if (formData.runtimeType === 'claude-code') {
      spec.claudeCode = {
        ...(formData.claudeCodeEnabled !== undefined && { enabled: formData.claudeCodeEnabled }),
        ...(formData.claudeCodeApiKey && { apiKey: formData.claudeCodeApiKey }),
        ...(formData.claudeCodeApiKeySecretName && { apiKeyRef: { name: formData.claudeCodeApiKeySecretName } }),
        ...(formData.claudeCodeMaxTurns !== undefined && { maxTurns: formData.claudeCodeMaxTurns }),
      }
    } else if (formData.runtimeType === 'opencode') {
      spec.opencode = {
        ...(formData.opencodeEnabled !== undefined && { enabled: formData.opencodeEnabled }),
        ...(formData.opencodeUsername && { username: formData.opencodeUsername }),
        ...(formData.opencodePassword && { password: formData.opencodePassword }),
        ...(formData.opencodePasswordSecretName && { passwordRef: { name: formData.opencodePasswordSecretName } }),
      }
    } else if (formData.runtimeType === 'openclaw') {
      spec.openclaw = {
        ...(formData.openclawEnabled !== undefined && { enabled: formData.openclawEnabled }),
        ...(formData.openclawToken && { token: formData.openclawToken }),
        ...(formData.openclawTokenSecretName && { tokenRef: { name: formData.openclawTokenSecretName } }),
      }
    }

    // Workspace defaults
    if (formData.workspaceSize || formData.workspaceStorageClassName || formData.workspaceMountPath) {
      spec.workspace = {
        ...(formData.workspaceSize && { size: formData.workspaceSize }),
        ...(formData.workspaceStorageClassName && { storageClassName: formData.workspaceStorageClassName }),
        ...(formData.workspaceMountPath && { mountPath: formData.workspaceMountPath }),
      }
    }

    // Deployment resource defaults
    const hasResources = formData.cpuRequest || formData.cpuLimit || formData.memoryRequest || formData.memoryLimit
    if (hasResources) {
      spec.deployment = {
        resources: {
          ...(formData.cpuRequest || formData.memoryRequest) && {
            requests: {
              ...(formData.cpuRequest && { cpu: formData.cpuRequest }),
              ...(formData.memoryRequest && { memory: formData.memoryRequest }),
            },
          },
          ...(formData.cpuLimit || formData.memoryLimit) && {
            limits: {
              ...(formData.cpuLimit && { cpu: formData.cpuLimit }),
              ...(formData.memoryLimit && { memory: formData.memoryLimit }),
            },
          },
        },
      }
    }

    const runtime: LanguageAgentRuntime = {
      apiVersion: 'langop.io/v1alpha1',
      kind: 'LanguageAgentRuntime',
      metadata: {
        name: formData.name,
        annotations: {
          'langop.io/created-by': userId,
          'langop.io/created-at': new Date().toISOString(),
        },
      },
      spec,
    }

    const response = await client.createLanguageAgentRuntime(runtime)
    console.log(`User ${userId} created LanguageAgentRuntime ${formData.name}`)

    return NextResponse.json({
      success: true,
      data: (response as any).data || response,
    })
  } catch (error) {
    console.error('Error creating runtime:', error)
    return NextResponse.json({ error: 'Failed to create runtime' }, { status: 500 })
  }
}
