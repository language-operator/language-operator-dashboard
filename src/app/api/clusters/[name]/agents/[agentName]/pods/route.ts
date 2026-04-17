import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import type { V1Pod, V1ContainerStatus } from '@kubernetes/client-node'


interface RouteParams {
  params: Promise<{
    name: string
    agentName: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, agentName } = await params

    console.log(`Fetching pods for agent ${agentName} in cluster ${clusterName}, namespace ${clusterName}`)

    // Find all pods for this agent (only agent pods, not trigger pods)
    const pods = await client.listPods(clusterName, {
      labelSelector: `app.kubernetes.io/name=${agentName},langop.io/component=agent`
    })

    // Handle different response structures from k8s client
    const podList: V1Pod[] = extractItems<V1Pod>(pods)

    console.log(`Found ${podList.length} pods for agent ${agentName}`)

    // Transform pods into a more user-friendly format
    const transformedPods = podList.map((pod: V1Pod) => {
      const status = pod.status?.phase || 'Unknown'
      const creationTimestamp = pod.metadata?.creationTimestamp
      const name = pod.metadata?.name || 'unknown'

      // Determine if this is a running pod
      const isRunning = status === 'Running'

      // Get container statuses for more detailed info
      const containerStatuses: V1ContainerStatus[] = pod.status?.containerStatuses || []
      const hasRunningContainers = containerStatuses.some((c: V1ContainerStatus) => c.state?.running)

      return {
        name,
        status,
        creationTimestamp,
        isRunning,
        hasRunningContainers,
        // Additional metadata that might be useful
        labels: pod.metadata?.labels || {},
        restartCount: containerStatuses.reduce((sum: number, c: V1ContainerStatus) => sum + (c.restartCount || 0), 0),
      }
    })

    // Sort pods by creation timestamp (newest first)
    const sortedPods = transformedPods.sort((a, b) =>
      new Date(b.creationTimestamp ?? 0).getTime() - new Date(a.creationTimestamp ?? 0).getTime()
    )

    // Determine the recommended pod (first running pod, or most recent if none running)
    const runningPods = sortedPods.filter(p => p.isRunning && p.hasRunningContainers)
    const recommendedPod = runningPods.length > 0 ? runningPods[0] : sortedPods[0]

    return NextResponse.json({
      data: sortedPods,
      recommendedPod: recommendedPod?.name || null,
      totalCount: sortedPods.length,
      runningCount: runningPods.length
    })

  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error fetching agent pods:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch agent pods',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}