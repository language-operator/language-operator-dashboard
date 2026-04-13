'use client'

import { useParams } from 'next/navigation'
import { useAgent } from '@/hooks/use-agents'
import { AgentLogs } from '@/components/agents/agent-logs'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function AgentLogsPage() {
  const params = useParams()
  const clusterName = params.name as string
  const agentName = params.agentName as string

  const { data: agentResponse, isLoading } = useAgent(agentName, clusterName)
  const agent = agentResponse?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading logs...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!agent) {
    return null // Layout handles error state
  }

  return <AgentLogs agent={agent} clusterName={clusterName} />
}
