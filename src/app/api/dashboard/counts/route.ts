import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { extractK8sStatusCode } from '@/lib/api-error-handler'

// GET /api/dashboard/counts - Get global resource counts across all accessible clusters
export async function GET(request: NextRequest) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    // List all clusters the user can see (cluster-scoped, impersonation filters by RBAC)
    const clustersRes = await client.listLanguageClusters('')
    const clusters = extractItems(clustersRes)

    // List namespaced resources across all namespaces the user can access.
    // Each resource type is cluster-scoped in its listing (no namespace filter) so
    // K8s returns everything the impersonated user is permitted to list.
    const [agentsRes, modelsRes, toolsRes, personasRes] = await Promise.allSettled([
      client.listLanguageAgents(''),
      client.listLanguageModels(''),
      client.listLanguageTools(''),
      client.listLanguagePersonas(''),
    ])

    const extract = (res: PromiseSettledResult<unknown>) => {
      if (res.status === 'rejected') return []
      return extractItems(res.value)
    }

    return NextResponse.json({
      success: true,
      data: {
        clusters: clusters.length,
        agents: extract(agentsRes).length,
        models: extract(modelsRes).length,
        tools: extract(toolsRes).length,
        personas: extract(personasRes).length,
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
    console.error('Error fetching dashboard counts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard counts' },
      { status: 500 }
    )
  }
}
