import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import { LanguageAgentRuntimeFormData } from '@/types/runtime'

// GET /api/runtimes/[name]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const { name } = await params

    const response = await client.getLanguageAgentRuntime(name)
    const runtime = (response as any)?.body || (response as any)?.data || response

    if (!runtime) {
      return NextResponse.json({ error: 'Runtime not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: runtime })
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json({ error: 'Runtime not found' }, { status: 404 })
    }
    console.error('Error fetching runtime:', error)
    return NextResponse.json({ error: 'Failed to fetch runtime' }, { status: 500 })
  }
}

// PUT /api/runtimes/[name]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const { name } = await params
    const formData: LanguageAgentRuntimeFormData = await request.json()

    // Fetch existing to preserve metadata/resourceVersion
    const existing = await client.getLanguageAgentRuntime(name)
    const existingRuntime = (existing as any)?.body || (existing as any)?.data || existing

    const spec: Record<string, unknown> = {}

    if (formData.image) spec.image = formData.image

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

    if (formData.workspaceSize || formData.workspaceStorageClassName || formData.workspaceMountPath) {
      spec.workspace = {
        ...(formData.workspaceSize && { size: formData.workspaceSize }),
        ...(formData.workspaceStorageClassName && { storageClassName: formData.workspaceStorageClassName }),
        ...(formData.workspaceMountPath && { mountPath: formData.workspaceMountPath }),
      }
    }

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

    const updatedRuntime = {
      metadata: {
        ...existingRuntime?.metadata,
        annotations: {
          ...(existingRuntime?.metadata?.annotations || {}),
          'langop.io/updated-by': userId,
          'langop.io/updated-at': new Date().toISOString(),
        },
      },
      spec,
    }

    const response = await client.updateLanguageAgentRuntime(name, updatedRuntime as unknown as import('@/types/runtime').LanguageAgentRuntime)
    console.log(`User ${userId} updated LanguageAgentRuntime ${name}`)

    return NextResponse.json({
      success: true,
      data: (response as any).data || response,
    })
  } catch (error) {
    console.error('Error updating runtime:', error)
    return NextResponse.json({ error: 'Failed to update runtime' }, { status: 500 })
  }
}

// DELETE /api/runtimes/[name]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const { name } = await params

    await client.deleteLanguageAgentRuntime(name)
    console.log(`User ${userId} deleted LanguageAgentRuntime ${name}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json({ error: 'Runtime not found' }, { status: 404 })
    }
    console.error('Error deleting runtime:', error)
    return NextResponse.json({ error: 'Failed to delete runtime' }, { status: 500 })
  }
}
