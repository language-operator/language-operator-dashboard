'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { LanguageAgent } from '@/types/agent'

interface AgentMetricsProps {
  agent: LanguageAgent
}

export function AgentMetrics({ agent }: AgentMetricsProps) {
  return (
    <div className="space-y-6">
      {/* Replica counts from status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-light">Active Replicas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light">
              {agent.status?.activeReplicas ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pods currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-light">Ready Replicas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light">
              {agent.status?.readyReplicas ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pods ready and passing health checks
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Execution metrics are not surfaced in the agent status by the operator. Use cluster-level monitoring (Prometheus, Grafana) to observe agent performance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
