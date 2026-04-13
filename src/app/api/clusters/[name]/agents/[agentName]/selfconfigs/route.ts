import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { LanguageAgentSelfConfig } from '@/types/selfconfig'

interface RouteParams {
  params: Promise<{ name: string; agentName: string }>
}

// GET /api/clusters/[name]/agents/[agentName]/selfconfigs
// Lists LanguageAgentSelfConfig resources in the cluster namespace, filtered to this agent.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params
    if (!clusterName || !agentName) {
      return NextResponse.json(
        { error: 'Cluster name and agent name are required' },
        { status: 400 }
      )
    }

    let allItems: LanguageAgentSelfConfig[] = []

    try {
      const response = await k8sClient.listLanguageAgentSelfConfigs(clusterName)
      allItems = extractItems<LanguageAgentSelfConfig>(response)
    } catch (k8sError) {
      console.error(
        'Error fetching self-configs from Kubernetes:',
        k8sError instanceof Error ? k8sError.message : String(k8sError)
      )
      // Return empty list — CRD may not be installed yet
      allItems = []
    }

    // Scope to the requesting agent
    const items = allItems.filter(
      (item: LanguageAgentSelfConfig) => item?.spec?.instanceRef === agentName
    )

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching agent self-configs:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch self-configs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
