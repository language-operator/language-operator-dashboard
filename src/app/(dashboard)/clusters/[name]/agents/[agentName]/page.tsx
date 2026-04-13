'use client'

import { useParams } from 'next/navigation'
import { useAgent } from '@/hooks/use-agents'
import { AgentOverview } from '@/components/agents/agent-overview'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function AgentOverviewPage() {
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
              <p className="text-muted-foreground">Loading agent...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!agent) {
    return null // Layout handles error state
  }

  return <AgentOverview agent={agent} clusterName={clusterName} />
}
