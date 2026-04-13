import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItem, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import type { V1Pod, V1Container, V1ContainerStatus } from '@kubernetes/client-node'
import { LanguageTool } from '@/types/tool'

interface RouteParams {
  params: Promise<{
    name: string
    toolName: string
  }>
}


export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, toolName } = await params

    console.log(`Fetching pods for tool ${toolName} in cluster ${clusterName}, namespace ${clusterName}`)

    // First, get the tool to understand its deployment mode
    const toolResource = await k8sClient.getLanguageTool(clusterName, toolName)
    const toolData = extractItem<LanguageTool>(toolResource)

    if (!toolData) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const deploymentMode = toolData.spec?.deploymentMode || 'service'

    let labelSelector = ''
    let podType = ''

    if (deploymentMode === 'sidecar') {
      // For sidecar tools, find agent pods that use this tool
      labelSelector = 'langop.io/kind=LanguageAgent'
      podType = 'agent'
      console.log(`Looking for agent pods using sidecar tool ${toolName}`)
    } else {
      // For service tools, find the tool's own deployment pods
      labelSelector = `app.kubernetes.io/name=${toolName}`
      podType = 'tool'
      console.log(`Looking for service pods for tool ${toolName}`)
    }

    // Find all relevant pods
    const podsResponse = await k8sClient.listPods(clusterName, {
      labelSelector
    })

    // Handle different response structures from k8s client
    const podList: V1Pod[] = extractItems<V1Pod>(podsResponse)

    console.log(`Found ${podList.length} ${podType} pods for tool ${toolName}`)

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

      // For sidecar mode, check if this pod actually uses the tool
      let hasToolContainer = true
      if (deploymentMode === 'sidecar') {
        // Check if this agent pod has the tool as a sidecar container or init container
        const containers: V1Container[] = pod.spec?.containers || []
        const initContainers: V1Container[] = pod.spec?.initContainers || []
        hasToolContainer = [...containers, ...initContainers].some((c: V1Container) =>
          c.name?.includes(toolName) || c.image?.includes(toolName)
        )
      }

      // Get available containers for log viewing (including init containers)
      const containers: V1Container[] = pod.spec?.containers || []
      const initContainers: V1Container[] = pod.spec?.initContainers || []
      const allContainers = [...containers, ...initContainers]
      const availableContainers = allContainers.map((c: V1Container) => ({
        name: c.name,
        image: c.image,
        isToolContainer: deploymentMode === 'sidecar'
          ? (c.name?.includes(toolName) || c.image?.includes(toolName))
          : c.name === toolName || c.name === 'tool',
      }))

      return {
        name,
        status,
        creationTimestamp,
        isRunning,
        hasRunningContainers,
        hasToolContainer, // For sidecar mode filtering
        deploymentMode,
        podType,
        availableContainers,
        // Additional metadata that might be useful
        labels: pod.metadata?.labels || {},
        restartCount: containerStatuses.reduce((sum: number, c: V1ContainerStatus) => sum + (c.restartCount || 0), 0),
      }
    })

    // Filter out agent pods that don't actually have this tool (for sidecar mode)
    const relevantPods = deploymentMode === 'sidecar' ? 
      transformedPods.filter(p => p.hasToolContainer) : 
      transformedPods

    // Sort pods by creation timestamp (newest first)
    const sortedPods = relevantPods.sort((a, b) =>
      new Date(b.creationTimestamp ?? 0).getTime() - new Date(a.creationTimestamp ?? 0).getTime()
    )

    // Determine the recommended pod (first running pod, or most recent if none running)
    const runningPods = sortedPods.filter(p => p.isRunning && p.hasRunningContainers)
    const recommendedPod = runningPods.length > 0 ? runningPods[0] : sortedPods[0]

    // For the recommended pod, suggest the most appropriate container
    let recommendedContainer = null
    if (recommendedPod && recommendedPod.availableContainers.length > 0) {
      // Prefer tool containers first, then any container
      const toolContainers = recommendedPod.availableContainers.filter(c => c.isToolContainer)
      recommendedContainer = toolContainers.length > 0 ? 
        toolContainers[0].name : 
        recommendedPod.availableContainers[0].name
    }

    return NextResponse.json({
      data: sortedPods,
      recommendedPod: recommendedPod?.name || null,
      recommendedContainer,
      totalCount: sortedPods.length,
      runningCount: runningPods.length,
      deploymentMode,
      podType
    })

  } catch (error) {
    console.error('Error fetching tool pods:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch tool pods',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}