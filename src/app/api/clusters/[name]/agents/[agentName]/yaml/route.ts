import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { LanguageAgent } from '@/types/agent'
import yaml from 'js-yaml'
import { extractK8sStatusCode } from '@/lib/api-error-handler'


// GET /api/clusters/[name]/agents/[agentName]/yaml - Get agent YAML
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

    // Convert agent object to YAML
    const yamlContent = yaml.dump(agent, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false,
    })

    // Return as plain text with appropriate content-type
    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    const k8sStatus = extractK8sStatusCode(error)
    if (k8sStatus === 401) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    if (k8sStatus === 403) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    console.error('Error fetching agent YAML:', error)
    return NextResponse.json({
      error: 'Failed to fetch agent YAML',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
