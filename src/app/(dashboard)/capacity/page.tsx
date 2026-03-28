'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Badge } from '@/components/ui/badge'
import { Server, Bot, Cpu, Wrench, Users, ExternalLink } from 'lucide-react'
import { useClusters } from '@/hooks/use-clusters'
import { LanguageCluster, ClusterCapacitySpec, ClusterCapacityStatus } from '@/types/cluster'

// Parse a k8s quantity string to a numeric value in millicores (CPU) or MiB (memory)
function parseCPU(q?: string): number {
  if (!q) return 0
  if (q.endsWith('m')) return parseInt(q)
  return parseFloat(q) * 1000
}

function parseMemoryMiB(q?: string): number {
  if (!q) return 0
  if (q.endsWith('Gi')) return parseFloat(q) * 1024
  if (q.endsWith('Mi')) return parseFloat(q)
  if (q.endsWith('Ki')) return parseFloat(q) / 1024
  return parseFloat(q) / (1024 * 1024)
}

function formatCPU(millicores: number): string {
  if (millicores >= 1000) return `${(millicores / 1000).toFixed(1)} cores`
  return `${millicores}m`
}

function formatMemory(mib: number): string {
  if (mib >= 1024) return `${(mib / 1024).toFixed(1)} Gi`
  return `${Math.round(mib)} Mi`
}

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{used} / {max} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ClusterCapacityCard({ cluster }: { cluster: LanguageCluster }) {
  const spec: ClusterCapacitySpec = cluster.spec?.capacity ?? {}
  const status: ClusterCapacityStatus = cluster.status?.capacity ?? {
    agentCount: 0, modelCount: 0, toolCount: 0, personaCount: 0,
  }
  const hasLimits = Object.keys(spec).length > 0

  const usedCPUm = parseCPU(status.totalCPULimits)
  const maxCPUm = parseCPU(spec.maxCPU)
  const usedMemMiB = parseMemoryMiB(status.totalMemoryLimits)
  const maxMemMiB = parseMemoryMiB(spec.maxMemory)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-light tracking-wider">
              <Link href={`/clusters/${cluster.metadata.name}`} className="hover:underline flex items-center gap-1.5">
                {cluster.metadata.name}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            </CardTitle>
            {cluster.spec?.domain && (
              <CardDescription className="font-mono text-xs mt-0.5">{cluster.spec.domain}</CardDescription>
            )}
          </div>
          <Badge className={
            cluster.status?.phase === 'Ready' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            cluster.status?.phase === 'Failed' ? 'bg-red-100 text-red-800' :
            'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
          }>
            {cluster.status?.phase ?? 'Unknown'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resource counts */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Bot, label: 'Agents', used: status.agentCount, max: spec.maxAgents },
            { icon: Cpu, label: 'Models', used: status.modelCount, max: spec.maxModels },
            { icon: Wrench, label: 'Tools', used: status.toolCount, max: spec.maxTools },
            { icon: Users, label: 'Personas', used: status.personaCount, max: spec.maxPersonas },
          ].map(({ icon: Icon, label, used, max }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{label}</span>
              <span className="ml-auto font-mono tabular-nums">
                {used}{max != null ? <span className="text-muted-foreground"> / {max}</span> : null}
              </span>
            </div>
          ))}
        </div>

        {/* Compute usage bars — only shown when limits are set */}
        {hasLimits && (spec.maxCPU || spec.maxMemory) && (
          <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-stone-800">
            {spec.maxCPU && (
              <UsageBar
                used={usedCPUm}
                max={maxCPUm}
                label={`CPU — ${formatCPU(usedCPUm)} of ${formatCPU(maxCPUm)}`}
              />
            )}
            {spec.maxMemory && (
              <UsageBar
                used={usedMemMiB}
                max={maxMemMiB}
                label={`Memory — ${formatMemory(usedMemMiB)} of ${formatMemory(maxMemMiB)}`}
              />
            )}
          </div>
        )}

        {!hasLimits && (
          <p className="text-xs text-muted-foreground italic">
            No capacity limits configured.{' '}
            <Link href={`/clusters/${cluster.metadata.name}/edit`} className="underline">
              Set limits
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function CapacityPage() {
  const { data: clustersResponse, isLoading, error } = useClusters({ limit: 100 })
  const clusters: LanguageCluster[] = clustersResponse?.data ?? []

  return (
    <div className="space-y-6">
      <ResourceHeader
        icon={Server}
        title="Capacity"
        subtitle="Resource consumption and limits across all clusters"
      />

      {isLoading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading clusters…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-8 text-center text-destructive text-sm">
            Failed to load clusters: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && clusters.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-stone-500 dark:text-stone-400 text-sm">
            No clusters found.
          </CardContent>
        </Card>
      )}

      {clusters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <ClusterCapacityCard key={cluster.metadata.name} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  )
}
