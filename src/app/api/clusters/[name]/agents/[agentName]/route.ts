import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { LanguageAgent, LanguageAgentFormData, LanguageAgentSpec } from '@/types/agent'


// GET /api/clusters/[name]/agents/[agentName] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; agentName: string }> }
) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    // Fetch specific agent from namespace
    let agent: LanguageAgent | null = null

    try {
      const response = await client.getLanguageAgent(clusterName, agentName)
      agent = extractItem<LanguageAgent>(response)
    } catch (k8sError) {
      if (k8sError instanceof Error && k8sError.message.includes('404')) {
        return NextResponse.json({
          error: 'Agent not found',
          details: `Agent "${agentName}" not found in cluster "${clusterName}"`
        }, { status: 404 })
      }

      console.error('Error fetching agent from Kubernetes:', k8sError)
      throw k8sError
    }

    if (!agent) {
      return NextResponse.json({
        error: 'Agent not found',
        details: `Agent "${agentName}" not found in cluster "${clusterName}"`
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: agent,
      cluster: clusterName,
    })

  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error fetching agent details:', error)
    return NextResponse.json({
      error: 'Failed to fetch agent details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH /api/clusters/[name]/agents/[agentName] - Update specific agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; agentName: string }> }
) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    const body: Partial<LanguageAgentFormData> = await request.json()

    // First, get the current agent to ensure it exists and get its current state
    let currentAgent: LanguageAgent | null = null
    try {
      const response = await client.getLanguageAgent(clusterName, agentName)
      currentAgent = extractItem<LanguageAgent>(response)
    } catch (k8sError) {
      if (k8sError instanceof Error && k8sError.message.includes('404')) {
        return NextResponse.json({
          error: 'Agent not found',
          details: `Agent "${agentName}" not found in cluster "${clusterName}"`
        }, { status: 404 })
      }
      throw k8sError
    }

    if (!currentAgent) {
      return NextResponse.json({
        error: 'Agent not found',
        details: `Agent "${agentName}" not found in cluster "${clusterName}"`
      }, { status: 404 })
    }

    // Build the updated agent spec
    const updatedSpec: LanguageAgentSpec = { ...currentAgent.spec }

    // Update basic fields
    if (body.instructions !== undefined) {
      updatedSpec.instructions = body.instructions
    }

    // Update model references — operator uses spec.models
    if (body.selectedModels) {
      updatedSpec.models = body.selectedModels.map((name: string) => ({ name }))
    }

    // Update tool references — operator uses spec.tools
    if (body.selectedTools) {
      updatedSpec.tools = body.selectedTools.map((name: string) => ({ name }))
    }

    // Update persona — operator uses spec.persona (string name)
    if (body.selectedPersona !== undefined) {
      if (body.selectedPersona && body.selectedPersona !== 'none') {
        updatedSpec.persona = body.selectedPersona
      } else {
        delete updatedSpec.persona
      }
    }

    // Update runtime preset
    if (body.runtime !== undefined) {
      if (body.runtime) {
        updatedSpec.runtime = body.runtime
      } else {
        delete updatedSpec.runtime
      }
    }

    // Update workspace retain
    if (body.workspaceRetain !== undefined) {
      if (body.workspaceRetain) {
        updatedSpec.workspace = { ...updatedSpec.workspace, retain: true }
      } else if (updatedSpec.workspace) {
        const { retain: _, ...rest } = updatedSpec.workspace
        updatedSpec.workspace = Object.keys(rest).length > 0 ? rest : undefined
      }
    }

    // Update self-configuration permissions
    if (body.selfConfigure !== undefined) {
      updatedSpec.selfConfigure = body.selfConfigure || undefined
    }

    // Create the updated agent object
    const updatedAgent: LanguageAgent = {
      ...currentAgent,
      spec: updatedSpec,
    }

    // Update agent in Kubernetes
    try {
      const response = await client.updateLanguageAgent(clusterName, agentName, updatedAgent)

      console.log(`User ${userId} updated LanguageAgent ${agentName} in cluster ${clusterName}`)

      return NextResponse.json({
        success: true,
        data: response,
        message: `Agent "${agentName}" updated successfully`,
        cluster: clusterName,
      })
    } catch (k8sError) {
      console.error('Error updating agent in Kubernetes:', k8sError)
      throw k8sError
    }

  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error updating agent:', error)
    return NextResponse.json({
      error: 'Failed to update agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/clusters/[name]/agents/[agentName] - Delete specific agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; agentName: string }> }
) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    // Delete agent from namespace
    try {
      await client.deleteLanguageAgent(clusterName, agentName)

      console.log(`User ${userId} deleted LanguageAgent ${agentName} from cluster ${clusterName}`)

      return NextResponse.json({
        success: true,
        message: `Agent "${agentName}" deleted successfully`,
        cluster: clusterName,
      })
    } catch (k8sError) {
      if (k8sError instanceof Error && k8sError.message.includes('404')) {
        return NextResponse.json({
          error: 'Agent not found',
          details: `Agent "${agentName}" not found in cluster "${clusterName}"`
        }, { status: 404 })
      }

      console.error('Error deleting agent from Kubernetes:', k8sError)
      throw k8sError
    }

  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error deleting agent:', error)
    return NextResponse.json({
      error: 'Failed to delete agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
