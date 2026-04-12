import { NextRequest, NextResponse } from 'next/server'
import { k8sClient } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { LanguageAgent, LanguageAgentFormData } from '@/types/agent'


// GET /api/clusters/[name]/agents/[agentName] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; agentName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    // Fetch specific agent from namespace
    let agent: LanguageAgent | null = null

    try {
      const response = await k8sClient.getLanguageAgent(clusterName, agentName)

      // Handle different response structures from k8s client
      if ((response as any)?.body) {
        agent = (response as any).body
      } else if ((response as any)?.data) {
        agent = (response as any).data
      } else if (response) {
        agent = response as LanguageAgent
      }
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
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    const body: Partial<LanguageAgentFormData> = await request.json()

    // First, get the current agent to ensure it exists and get its current state
    let currentAgent: LanguageAgent | null = null
    try {
      const response = await k8sClient.getLanguageAgent(clusterName, agentName)

      if ((response as any)?.body) {
        currentAgent = (response as any).body
      } else if ((response as any)?.data) {
        currentAgent = (response as any).data
      } else if (response) {
        currentAgent = response as LanguageAgent
      }
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
    const updatedSpec: any = { ...currentAgent.spec }

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
      const response = await k8sClient.updateLanguageAgent(clusterName, agentName, updatedAgent)

      console.log(`User ${email} updated LanguageAgent ${agentName} in cluster ${clusterName}`)

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
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json({ error: 'Cluster name and agent name are required' }, { status: 400 })
    }

    // Delete agent from namespace
    try {
      await k8sClient.deleteLanguageAgent(clusterName, agentName)

      console.log(`User ${email} deleted LanguageAgent ${agentName} from cluster ${clusterName}`)

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
    console.error('Error deleting agent:', error)
    return NextResponse.json({
      error: 'Failed to delete agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
