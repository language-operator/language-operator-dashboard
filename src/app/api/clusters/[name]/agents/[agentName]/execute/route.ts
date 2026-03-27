import { NextRequest, NextResponse } from 'next/server'
import { k8sClient } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

interface RouteParams {
  params: Promise<{
    name: string
    agentName: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, agentName } = await params

    console.log(`Manual execution requested for agent ${agentName} in cluster ${clusterName}, namespace ${NAMESPACE}`)

    // Get the agent to validate it exists and is scheduled
    const agent = await k8sClient.getLanguageAgent(NAMESPACE, agentName)

    // Handle different response structures from k8s client
    let agentData: any = null
    if ((agent as any)?.body) {
      agentData = (agent as any).body
    } else if ((agent as any)?.data) {
      agentData = (agent as any).data
    } else if (agent) {
      agentData = agent
    }

    if (!agentData) {
      return NextResponse.json({
        error: `Agent "${agentName}" not found`,
        message: `Agent "${agentName}" not found in namespace ${NAMESPACE}`
      }, { status: 404 })
    }

    // Validate agent is scheduled execution mode
    if (agentData.spec?.executionMode !== 'scheduled') {
      return NextResponse.json({
        error: 'Agent is not scheduled',
        message: `Agent "${agentName}" has execution mode "${agentData.spec?.executionMode || 'unknown'}", only scheduled agents can be run manually`
      }, { status: 400 })
    }

    // Generate unique job name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()
    const jobName = `${agentName}-manual-${timestamp}`

    // Create manual execution Job from the agent's CronJob
    const createdJob = await k8sClient.createJobFromCronJob(NAMESPACE, agentName, jobName)

    console.log(`Manual execution Job created: ${jobName}`)

    // Return job information
    return NextResponse.json({
      success: true,
      jobName,
      agentName,
      namespace: NAMESPACE,
      message: `Manual execution started for agent "${agentName}"`,
      job: {
        name: jobName,
        namespace: NAMESPACE,
        createdAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating manual execution job:', error)

    return NextResponse.json(
      {
        error: 'Failed to execute agent manually',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
