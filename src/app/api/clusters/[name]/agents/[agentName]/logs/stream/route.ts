import { NextRequest } from 'next/server'
import { k8sClient } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

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
    const url = new URL(request.url)
    const podName = url.searchParams.get('podName')

    console.log(`Starting log stream for agent ${agentName} in cluster ${clusterName}${podName ? `, pod ${podName}` : ''}`)

    // Find the pod for this agent
    const pods = await k8sClient.listPods(NAMESPACE, {
      labelSelector: `app.kubernetes.io/name=${agentName}`
    })

    // Handle different response structures from k8s client
    let podList: any[] = []
    if ((pods as any)?.body?.items) {
      podList = (pods as any).body.items
    } else if ((pods as any)?.data?.items) {
      podList = (pods as any).data.items
    } else if (Array.isArray(pods)) {
      podList = pods
    } else if ((pods as any)?.items) {
      podList = (pods as any).items
    }

    if (podList.length === 0) {
      return new Response('No pods found for this agent', { status: 404 })
    }

    // Select the appropriate pod
    let pod
    if (podName) {
      pod = podList.find(p => p.metadata.name === podName)
      if (!pod) {
        return new Response(`Pod "${podName}" not found for agent ${agentName}`, { status: 404 })
      }
    } else {
      const runningPods = podList.filter(p => p.status?.phase === 'Running')
      if (runningPods.length > 0) {
        pod = runningPods.sort((a, b) =>
          new Date(b.metadata.creationTimestamp).getTime() -
          new Date(a.metadata.creationTimestamp).getTime()
        )[0]
      } else {
        pod = podList.sort((a, b) =>
          new Date(b.metadata.creationTimestamp).getTime() -
          new Date(a.metadata.creationTimestamp).getTime()
        )[0]
      }
    }

    console.log(`Streaming logs from pod: ${pod.metadata.name}`)

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        const streamLogs = async () => {
          try {
            const logStream = await k8sClient.streamPodLogs(NAMESPACE, pod.metadata.name, {
              follow: true,
              timestamps: true,
              tailLines: 10
            })

            if (typeof logStream === 'string') {
              const lines = logStream.split('\n').filter(line => line.trim())
              lines.forEach(line => {
                if (line.trim()) {
                  const sseData = `data: ${line}\n\n`
                  controller.enqueue(encoder.encode(sseData))
                }
              })
              controller.close()
            } else {
              const pollLogs = async () => {
                try {
                  const logs = await k8sClient.getPodLogs(NAMESPACE, pod.metadata.name, {
                    tailLines: 1,
                    timestamps: true,
                    sinceSeconds: 1
                  })

                  let logContent = ''
                  if (typeof logs === 'string') {
                    logContent = logs
                  } else if ((logs as any)?.body) {
                    logContent = (logs as any).body
                  } else if ((logs as any)?.data) {
                    logContent = (logs as any).data
                  }

                  if (logContent && logContent.trim()) {
                    const lines = logContent.split('\\n').filter(line => line.trim())
                    lines.forEach(line => {
                      if (line.trim()) {
                        const sseData = `data: ${line}\\n\\n`
                        controller.enqueue(encoder.encode(sseData))
                      }
                    })
                  }
                } catch (error) {
                  console.error('Polling error:', error)
                }
              }

              const interval = setInterval(pollLogs, 2000)

              const cleanup = () => {
                clearInterval(interval)
                controller.close()
              }

              request.signal.addEventListener('abort', cleanup)
            }
          } catch (error) {
            console.error('Error starting log stream:', error)
            const sseError = `data: [ERROR] Failed to start log stream: ${error}\\n\\n`
            controller.enqueue(encoder.encode(sseError))
            controller.close()
          }
        }

        streamLogs()
      },
      cancel() {
        console.log('Stream cancelled')
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    console.error('Error setting up log stream:', error)
    return new Response(
      `Error setting up log stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}
