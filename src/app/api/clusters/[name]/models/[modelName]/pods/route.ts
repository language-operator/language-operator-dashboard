import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import type { V1Pod } from '@kubernetes/client-node'

interface RouteParams {
  params: Promise<{
    name: string
    modelName: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { email } = await getAuthenticatedUser(request)
    

    const { name: clusterName, modelName } = await params

    console.log(`Fetching proxy pods for cluster ${clusterName} (model ${modelName})`)

    // Models no longer have their own pods. Find the shared proxy pod in the cluster's namespace.
    // The operator creates a namespace named after the cluster and deploys 'proxy' there.
    const pods = await k8sClient.listPods(clusterName, {
      labelSelector: `langop.io/kind=proxy,langop.io/cluster=${clusterName}`
    })

    // Handle different response structures from k8s client
    const podList: V1Pod[] = extractItems<V1Pod>(pods)

    console.log(`Found ${podList.length} proxy pod(s) for cluster ${clusterName}`)

    // Transform pods into the expected format
    const transformedPods = podList.map(pod => ({
      name: pod.metadata?.name || '',
      status: pod.status?.phase || 'Unknown',
      isRunning: pod.status?.phase === 'Running',
      creationTimestamp: pod.metadata?.creationTimestamp || '',
      availableContainers: pod.spec?.containers?.map(container => ({
        name: container.name,
        image: container.image || '',
        isToolContainer: false
      })) || []
    }))

    // Find the recommended pod (most recent running pod, or most recent if none running)
    let recommendedPod = null
    if (transformedPods.length > 0) {
      const runningPods = transformedPods.filter(p => p.isRunning)
      if (runningPods.length > 0) {
        recommendedPod = runningPods.sort((a, b) => {
          const aTime = a.creationTimestamp ? new Date(a.creationTimestamp).getTime() : 0
          const bTime = b.creationTimestamp ? new Date(b.creationTimestamp).getTime() : 0
          return bTime - aTime
        })[0].name
      } else {
        recommendedPod = transformedPods.sort((a, b) => {
          const aTime = a.creationTimestamp ? new Date(a.creationTimestamp).getTime() : 0
          const bTime = b.creationTimestamp ? new Date(b.creationTimestamp).getTime() : 0
          return bTime - aTime
        })[0].name
      }
    }

    return NextResponse.json({
      data: transformedPods,
      recommendedPod,
      recommendedContainer: null, // Models typically don't have multiple containers
      deploymentMode: 'service',
      podType: 'proxy'
    })

  } catch (error) {
    console.error('Error fetching model pods:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch model pods',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}