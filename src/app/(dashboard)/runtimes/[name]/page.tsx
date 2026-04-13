'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Cpu, Edit, AlertCircle } from 'lucide-react'
import { ResourceHeader } from '@/components/ui/resource-header'
import { useRuntime } from '@/hooks/use-runtimes'
import { LanguageAgentRuntime, inferRuntimeType, RuntimeType } from '@/types/runtime'

function formatTimeAgo(timestamp?: string | Date) {
  if (!timestamp) return 'Unknown'
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  return 'Just now'
}

function SpecRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono">{String(value)}</span>
    </div>
  )
}

function RuntimeTypeSection({ runtime }: { runtime: LanguageAgentRuntime }) {
  const type = inferRuntimeType(runtime.spec)

  if (type === 'claude-code' && runtime.spec.claudeCode) {
    const cc = runtime.spec.claudeCode
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claude Code Config</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecRow label="Enabled" value={cc.enabled} />
          <SpecRow label="API Key" value={cc.apiKey ? '••••••••' : undefined} />
          <SpecRow label="API Key Secret" value={cc.apiKeyRef?.name} />
          <SpecRow label="Max Turns" value={cc.maxTurns} />
        </CardContent>
      </Card>
    )
  }

  if (type === 'opencode' && runtime.spec.opencode) {
    const oc = runtime.spec.opencode
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opencode Config</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecRow label="Enabled" value={oc.enabled} />
          <SpecRow label="Username" value={oc.username} />
          <SpecRow label="Password" value={oc.password ? '••••••••' : undefined} />
          <SpecRow label="Password Secret" value={oc.passwordRef?.name} />
        </CardContent>
      </Card>
    )
  }

  if (type === 'openclaw' && runtime.spec.openclaw) {
    const claw = runtime.spec.openclaw
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Openclaw Config</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecRow label="Enabled" value={claw.enabled} />
          <SpecRow label="Token" value={claw.token ? '••••••••' : undefined} />
          <SpecRow label="Token Secret" value={claw.tokenRef?.name} />
        </CardContent>
      </Card>
    )
  }

  return null
}

export default function RuntimeDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const { data, isLoading, error } = useRuntime(name)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ResourceHeader
          backHref="/runtimes"
          backLabel="Back to Runtimes"
          icon={Cpu}
          title="Loading..."
          subtitle="Loading runtime details..."
        />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-6">
        <ResourceHeader
          backHref="/runtimes"
          backLabel="Back to Runtimes"
          icon={Cpu}
          title="Runtime Not Found"
          subtitle={`The runtime "${name}" could not be loaded.`}
        />
        <div className="flex items-center justify-center h-32">
          <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
          <span className="text-muted-foreground">Runtime not found</span>
        </div>
      </div>
    )
  }

  const runtime: LanguageAgentRuntime = data.data
  const type = inferRuntimeType(runtime.spec)
  const ws = runtime.spec.workspace
  const dep = runtime.spec.deployment

  return (
    <div className="space-y-6">
      <ResourceHeader
        backHref="/runtimes"
        backLabel="Back to Runtimes"
        icon={Cpu}
        title={
          <span className="flex items-center gap-3">
            {runtime.metadata.name}
            <Badge variant="outline" className="font-mono text-xs font-light">
              {type}
            </Badge>
          </span>
        }
        subtitle={`Created ${formatTimeAgo(runtime.metadata.creationTimestamp)}`}
        actions={
          <Link href={`/runtimes/${name}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        }
      />

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SpecRow label="Name" value={runtime.metadata.name} />
          <SpecRow label="Type" value={type} />
          <SpecRow label="Image" value={runtime.spec.image} />
          <SpecRow label="Created" value={runtime.metadata.creationTimestamp ? new Date(runtime.metadata.creationTimestamp).toISOString() : undefined} />
          <SpecRow label="Created by" value={runtime.metadata.annotations?.['langop.io/created-by-email']} />
        </CardContent>
      </Card>

      {/* Credential config */}
      <RuntimeTypeSection runtime={runtime} />

      {/* Workspace defaults */}
      {ws && (
        <Card>
          <CardHeader>
            <CardTitle>Workspace Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <SpecRow label="Size" value={ws.size} />
            <SpecRow label="Storage Class" value={ws.storageClassName} />
            <SpecRow label="Mount Path" value={ws.mountPath} />
            <SpecRow label="Retain" value={ws.retain} />
          </CardContent>
        </Card>
      )}

      {/* Resource defaults */}
      {dep?.resources && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <SpecRow label="CPU Request" value={(dep.resources.requests as any)?.cpu} />
            <SpecRow label="CPU Limit" value={(dep.resources.limits as any)?.cpu} />
            <SpecRow label="Memory Request" value={(dep.resources.requests as any)?.memory} />
            <SpecRow label="Memory Limit" value={(dep.resources.limits as any)?.memory} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
