'use client'

import { useAgentSelfConfigs } from '@/hooks/use-selfconfigs'
import { LanguageAgent } from '@/types/agent'
import { LanguageAgentSelfConfigSpec, SelfConfigPhase } from '@/types/selfconfig'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeAgo } from '@/components/agents/utils'

function phaseBadgeClass(phase?: SelfConfigPhase): string {
  switch (phase) {
    case 'Applied':
      return 'border-green-600 text-green-700 dark:border-green-500 dark:text-green-400'
    case 'Failed':
      return 'border-red-600 text-red-700 dark:border-red-500 dark:text-red-400'
    case 'Denied':
      return 'border-stone-500 text-stone-600 dark:border-stone-500 dark:text-stone-400'
    case 'Pending':
    default:
      return 'border-yellow-600 text-yellow-700 dark:border-yellow-500 dark:text-yellow-400'
  }
}

function summarizeChanges(spec: LanguageAgentSelfConfigSpec): string {
  const parts: string[] = []
  if (spec.addTools?.length) parts.push(`add tools: ${spec.addTools.join(', ')}`)
  if (spec.removeTools?.length) parts.push(`remove tools: ${spec.removeTools.join(', ')}`)
  if (spec.addModels?.length) parts.push(`add models: ${spec.addModels.join(', ')}`)
  if (spec.removeModels?.length) parts.push(`remove models: ${spec.removeModels.join(', ')}`)
  if (spec.addEnvVars?.length) parts.push(`add env vars: ${spec.addEnvVars.map(e => e.name).join(', ')}`)
  if (spec.updateInstructions) parts.push('update instructions')
  if (spec.addRoleRules?.length) parts.push(`add role rules (${spec.addRoleRules.length})`)
  return parts.join(' · ') || '—'
}

interface AgentSelfConfigsProps {
  agent: LanguageAgent
  clusterName: string
}

export function AgentSelfConfigs({ agent, clusterName }: AgentSelfConfigsProps) {
  const { data, isLoading, error } = useAgentSelfConfigs(
    agent.metadata.name!,
    clusterName
  )
  const items = data?.data ?? []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
            <p className="text-gray-600">Loading self-configs...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-red-600 text-sm">Failed to load self-configuration requests.</p>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-muted-foreground text-sm">No self-configuration requests</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Age</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Requested Changes</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.metadata.name}>
                <TableCell className="whitespace-nowrap">
                  {formatTimeAgo(item.metadata.creationTimestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={phaseBadgeClass(item.status?.phase)}>
                    {item.status?.phase ?? 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  {summarizeChanges(item.spec)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.status?.completionTime
                    ? new Date(item.status.completionTime).toLocaleString()
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
