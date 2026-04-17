import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem, extractItems } from '@/lib/k8s-client'
import { LanguageTool } from '@/types/tool'
import { V1Pod, V1Container } from '@kubernetes/client-node'
import { extractK8sStatusCode } from '@/lib/api-error-handler'

interface RouteParams {
  params: Promise<{
    name: string
    toolName: string
  }>
}


export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, toolName } = await params
    const searchParams = new URL(request.url).searchParams
    const podName = searchParams.get('podName')
    const containerName = searchParams.get('containerName')

    console.log(`Fetching logs for tool ${toolName} in cluster ${clusterName}, namespace ${clusterName}${podName ? `, pod ${podName}` : ''}${containerName ? `, container ${containerName}` : ''}`)

    // First, get the tool to understand its deployment mode
    const toolResource = await client.getLanguageTool(clusterName, toolName)
    const toolData = extractItem<LanguageTool>(toolResource)

    if (!toolData) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const deploymentMode = toolData.spec?.deploymentMode || 'service'

    // Find the appropriate pods based on deployment mode
    let labelSelector = ''
    if (deploymentMode === 'sidecar') {
      // For sidecar tools, find agent pods that use this tool
      labelSelector = 'langop.io/kind=LanguageAgent'
    } else {
      // For service tools, find the tool's own deployment pods
      labelSelector = `app.kubernetes.io/name=${toolName}`
    }

    const pods = await client.listPods(clusterName, {
      labelSelector
    })

    // Handle different response structures from k8s client
    let podList: V1Pod[] = Array.isArray(pods) ? pods : extractItems<V1Pod>(pods)

    // For sidecar mode, filter to only pods that actually have this tool
    if (deploymentMode === 'sidecar') {
      podList = podList.filter(pod => {
        const containers: V1Container[] = pod.spec?.containers || []
        const initContainers: V1Container[] = pod.spec?.initContainers || []
        const allContainers = [...containers, ...initContainers]
        return allContainers.some((c: V1Container) => c.name?.includes(toolName) || c.image?.includes(toolName))
      })
    }

    console.log(`Found ${podList.length} pods for ${deploymentMode} tool ${toolName}`)

    if (podList.length === 0) {
      return NextResponse.json({
        logs: deploymentMode === 'sidecar'
          ? 'No agent pods found using this sidecar tool.'
          : 'No pods found for this service tool.',
        message: `Tool has no running pods in ${deploymentMode} mode`
      })
    }

    // Select the appropriate pod
    let pod: V1Pod
    if (podName) {
      // Find the specific pod requested
      const found = podList.find(p => p.metadata?.name === podName)
      if (!found) {
        return NextResponse.json({
          error: `Pod "${podName}" not found`,
          message: `Pod "${podName}" not found for tool ${toolName}`
        }, { status: 404 })
      }
      pod = found
    } else {
      // Default behavior: get the most recent running pod, or most recent if none running
      const runningPods = podList.filter(p => p.status?.phase === 'Running')
      if (runningPods.length > 0) {
        pod = runningPods.sort((a, b) =>
          new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
          new Date(a.metadata?.creationTimestamp ?? 0).getTime()
        )[0]
      } else {
        pod = podList.sort((a, b) =>
          new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
          new Date(a.metadata?.creationTimestamp ?? 0).getTime()
        )[0]
      }
    }

    console.log(`Getting logs from pod: ${pod.metadata?.name}`)

    // Determine which container to get logs from
    let targetContainer = containerName
    if (!targetContainer) {
      // Auto-select the appropriate container
      const containers: V1Container[] = pod.spec?.containers || []
      const initContainers: V1Container[] = pod.spec?.initContainers || []


      if (deploymentMode === 'sidecar') {
        // For sidecar mode, prefer the tool container (check both regular and init containers)
        const allContainers = [...containers, ...initContainers]

        // Try different matching strategies for tool containers
        let toolContainer = allContainers.find((c: V1Container) =>
          c.name?.includes(toolName) || c.image?.includes(toolName)
        )

        // If not found with exact tool name, try common sidecar container naming patterns
        if (!toolContainer) {
          toolContainer = allContainers.find((c: V1Container) =>
            c.name?.includes(`tool-${toolName}`) ||
            c.name?.startsWith('tool-') ||
            c.name?.endsWith(`-${toolName}`)
          )
        }


        targetContainer = toolContainer?.name || containers[0]?.name
      } else {
        // For service mode, prefer the main container (usually the first one)
        targetContainer = containers[0]?.name
      }
    }

    console.log(`Getting logs from container: ${targetContainer}`)

    // Fetch logs from the pod/container
    const logOptions: {
      tailLines?: number
      timestamps?: boolean
      sinceSeconds?: number
      container?: string
      previous?: boolean
    } = {
      tailLines: 500, // Get last 500 lines
      timestamps: true
    }

    // Add container name if specified
    if (targetContainer) {
      logOptions.container = targetContainer

      // Check if this is an init container - if so, we need to handle it specially
      const isInitContainer = pod.spec?.initContainers?.some((ic: V1Container) => ic.name === targetContainer)
      if (isInitContainer) {
        // For init containers, get current logs (not previous run)
        logOptions.previous = false
      }
    }

    const logs = await client.getPodLogs(clusterName, pod.metadata?.name ?? '', logOptions)

    const logContent = (typeof logs === 'string' ? logs : extractItem<string>(logs)) ?? ''

    return NextResponse.json({
      logs: logContent || 'No logs available',
      podName: pod.metadata?.name,
      containerName: targetContainer,
      deploymentMode,
      message: 'Logs retrieved successfully'
    })

  } catch (error) {
    const k8sStatus = extractK8sStatusCode(error)
    if (k8sStatus === 401) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    if (k8sStatus === 403) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    console.error('Error fetching tool logs:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch tool logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
