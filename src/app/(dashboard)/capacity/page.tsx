'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResourceHeader } from '@/components/ui/resource-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Server, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useClusters } from '@/hooks/use-clusters'
import { LanguageCluster, ClusterCapacitySpec, ClusterCapacityStatus } from '@/types/cluster'

// ── Quantity parsing ──────────────────────────────────────────────────────────

function parseCPUm(q?: string): number {
  if (!q) return 0
  if (q.endsWith('m')) return parseInt(q)
  return parseFloat(q) * 1000
}

function parseMemMiB(q?: string): number {
  if (!q) return 0
  if (q.endsWith('Gi')) return parseFloat(q) * 1024
  if (q.endsWith('Mi')) return parseFloat(q)
  if (q.endsWith('Ki')) return parseFloat(q) / 1024
  return parseFloat(q) / (1024 * 1024)
}

function formatCPU(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}` : `${m}m`
}

function formatMem(mib: number): string {
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)}Gi` : `${Math.round(mib)}Mi`
}

// ── Derived row type ──────────────────────────────────────────────────────────

type SortKey = 'name' | 'agents' | 'models' | 'tools' | 'personas' | 'cpu' | 'memory'

interface CapacityRow {
  name: string
  spec: ClusterCapacitySpec
  status: ClusterCapacityStatus
  // pre-computed % values (null = no limit set)
  pct: Record<SortKey, number | null>
}

function toRow(cluster: LanguageCluster): CapacityRow {
  const spec: ClusterCapacitySpec = cluster.spec?.capacity ?? {}
  const status: ClusterCapacityStatus = cluster.status?.capacity ?? {
    agentCount: 0, modelCount: 0, toolCount: 0, personaCount: 0,
  }

  const pct = (used: number, max?: number): number | null =>
    max != null && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : null

  const usedCPUm = parseCPUm(status.totalCPULimits)
  const maxCPUm = parseCPUm(spec.maxCPU)
  const usedMemMiB = parseMemMiB(status.totalMemoryLimits)
  const maxMemMiB = parseMemMiB(spec.maxMemory)

  return {
    name: cluster.metadata.name!,
    spec,
    status,
    pct: {
      name: null,
      agents:   pct(status.agentCount,   spec.maxAgents),
      models:   pct(status.modelCount,   spec.maxModels),
      tools:    pct(status.toolCount,    spec.maxTools),
      personas: pct(status.personaCount, spec.maxPersonas),
      cpu:      pct(usedCPUm, maxCPUm),
      memory:   pct(usedMemMiB, maxMemMiB),
    },
  }
}

// ── Sorting ───────────────────────────────────────────────────────────────────

function sortRows(rows: CapacityRow[], key: SortKey, dir: 'asc' | 'desc'): CapacityRow[] {
  return [...rows].sort((a, b) => {
    let av: number, bv: number
    if (key === 'name') {
      const cmp = a.name.localeCompare(b.name)
      return dir === 'asc' ? cmp : -cmp
    }
    // For % columns: null (no limit) sorts to bottom regardless of direction
    av = a.pct[key] ?? (dir === 'asc' ? Infinity : -Infinity)
    bv = b.pct[key] ?? (dir === 'asc' ? Infinity : -Infinity)
    return dir === 'asc' ? av - bv : bv - av
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="h-1 w-full rounded-full bg-stone-200 dark:bg-stone-700 mt-1">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function UsageCell({
  used, max, format,
}: {
  used: number
  max?: number
  format: (n: number) => string
}) {
  if (max == null || max === 0) {
    return <span className="text-muted-foreground tabular-nums">{format(used)}</span>
  }
  const pct = Math.min(100, Math.round((used / max) * 100))
  return (
    <div className="min-w-[80px]">
      <span className="tabular-nums text-sm">
        {format(used)}
        <span className="text-muted-foreground text-xs"> / {format(max)}</span>
      </span>
      <PctBar pct={pct} />
    </div>
  )
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />
  return dir === 'asc'
    ? <ChevronUp className="h-3 w-3 ml-1 inline" />
    : <ChevronDown className="h-3 w-3 ml-1 inline" />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CapacityPage() {
  const [sortKey, setSortKey] = React.useState<SortKey>('name')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')

  const { data: clustersResponse, isLoading, error } = useClusters({ limit: 100 })
  const clusters: LanguageCluster[] = clustersResponse?.data ?? []

  const rows = sortRows(clusters.map(toRow), sortKey, sortDir)

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function th(key: SortKey, label: string, className?: string) {
    return (
      <TableHead
        className={`cursor-pointer select-none whitespace-nowrap ${className ?? ''}`}
        onClick={() => handleSort(key)}
      >
        {label}
        <SortIcon col={key} sortKey={sortKey} dir={sortDir} />
      </TableHead>
    )
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        icon={Server}
        title="Capacity"
        subtitle="Resource consumption and limits across all clusters"
      />

      {isLoading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-8 text-center text-destructive text-sm">
            Failed to load clusters: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Clusters ({rows.length})</CardTitle>
            <CardDescription>
              Click any column header to sort. Bars show used / limit; clusters without limits show raw counts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {th('name',     'Cluster')}
                  {th('agents',   'Agents')}
                  {th('models',   'Models')}
                  {th('tools',    'Tools')}
                  {th('personas', 'Personas')}
                  {th('cpu',      'CPU')}
                  {th('memory',   'Memory')}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No clusters found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const usedCPUm  = parseCPUm(row.status.totalCPULimits)
                  const maxCPUm   = parseCPUm(row.spec.maxCPU)
                  const usedMem   = parseMemMiB(row.status.totalMemoryLimits)
                  const maxMem    = parseMemMiB(row.spec.maxMemory)

                  return (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">
                        <Link href={`/clusters/${row.name}`} className="hover:underline">
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <UsageCell used={row.status.agentCount}   max={row.spec.maxAgents}   format={String} />
                      </TableCell>
                      <TableCell>
                        <UsageCell used={row.status.modelCount}   max={row.spec.maxModels}   format={String} />
                      </TableCell>
                      <TableCell>
                        <UsageCell used={row.status.toolCount}    max={row.spec.maxTools}    format={String} />
                      </TableCell>
                      <TableCell>
                        <UsageCell used={row.status.personaCount} max={row.spec.maxPersonas} format={String} />
                      </TableCell>
                      <TableCell>
                        <UsageCell used={usedCPUm} max={maxCPUm || undefined} format={formatCPU} />
                      </TableCell>
                      <TableCell>
                        <UsageCell used={usedMem} max={maxMem || undefined} format={formatMem} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
