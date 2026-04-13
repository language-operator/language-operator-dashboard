import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import type { V1Pod } from '@kubernetes/client-node'


interface RouteParams {
  params: Promise<{
    name: string
    agentName: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params
    const searchParams = new URL(request.url).searchParams
    const podName = searchParams.get('podName')

    console.log(`Fetching logs for agent ${agentName} in cluster ${clusterName}, namespace ${clusterName}${podName ? `, pod ${podName}` : ''}`)

    // Find the pod for this agent
    const pods = await k8sClient.listPods(clusterName, {
      labelSelector: `app.kubernetes.io/name=${agentName}`
    })

    // Handle different response structures from k8s client
    const podList: V1Pod[] = extractItems<V1Pod>(pods)

    console.log(`Found ${podList.length} pods for agent ${agentName}`)

    if (podList.length === 0) {
      return NextResponse.json({
        logs: 'No pods found for this agent.',
        message: 'Agent has no running pods'
      })
    }

    // Select the appropriate pod
    let pod: V1Pod | undefined
    if (podName) {
      pod = podList.find(p => p.metadata?.name === podName)
      if (!pod) {
        return NextResponse.json({
          error: `Pod "${podName}" not found`,
          message: `Pod "${podName}" not found for agent ${agentName}`
        }, { status: 404 })
      }
    } else {
      // Default behavior: get the most recent running pod, or most recent if none running
      const getTime = (p: V1Pod) => new Date(p.metadata?.creationTimestamp ?? 0).getTime()
      const runningPods = podList.filter(p => p.status?.phase === 'Running')
      if (runningPods.length > 0) {
        pod = runningPods.sort((a, b) => getTime(b) - getTime(a))[0]
      } else {
        pod = podList.sort((a, b) => getTime(b) - getTime(a))[0]
      }
    }

    if (!pod) {
      return NextResponse.json({ logs: 'No pods found for this agent.', message: 'Agent has no pods' })
    }

    console.log(`Getting logs from pod: ${pod.metadata?.name}`)

    // Fetch logs from the pod
    const logs = await k8sClient.getPodLogs(clusterName, pod.metadata?.name ?? '', {
      tailLines: 500,
      timestamps: true
    })

    // Handle different response structures from k8s client
    let logContent = ''
    if (typeof logs === 'string') {
      logContent = logs
    } else if ((logs as { body?: string })?.body) {
      logContent = (logs as { body: string }).body
    } else if ((logs as { data?: string })?.data) {
      logContent = (logs as { data: string }).data
    }

    return NextResponse.json({
      logs: logContent || 'No logs available',
      podName: pod.metadata?.name,
      message: 'Logs retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching agent logs:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch agent logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
