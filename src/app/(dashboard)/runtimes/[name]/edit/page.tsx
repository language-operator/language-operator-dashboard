'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Cpu, AlertCircle } from 'lucide-react'
import { ResourceHeader } from '@/components/ui/resource-header'
import { useRuntime, useUpdateRuntime } from '@/hooks/use-runtimes'
import { RuntimeType, inferRuntimeType } from '@/types/runtime'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  runtimeType: z.enum(['claude-code', 'opencode', 'openclaw', 'custom']),
  image: z.string().optional(),
  claudeCodeEnabled: z.boolean().optional(),
  claudeCodeApiKey: z.string().optional(),
  claudeCodeApiKeySecretName: z.string().optional(),
  claudeCodeMaxTurns: z.string().optional(),
  opencodeEnabled: z.boolean().optional(),
  opencodeUsername: z.string().optional(),
  opencodePassword: z.string().optional(),
  opencodePasswordSecretName: z.string().optional(),
  openclawEnabled: z.boolean().optional(),
  openclawToken: z.string().optional(),
  openclawTokenSecretName: z.string().optional(),
  workspaceSize: z.string().optional(),
  workspaceStorageClassName: z.string().optional(),
  workspaceMountPath: z.string().optional(),
  cpuRequest: z.string().optional(),
  cpuLimit: z.string().optional(),
  memoryRequest: z.string().optional(),
  memoryLimit: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function EditRuntimePage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const updateRuntime = useUpdateRuntime()
  const { data, isLoading, error } = useRuntime(name)
  const [runtimeType, setRuntimeType] = useState<RuntimeType>('custom')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { runtimeType: 'custom' },
  })

  const claudeCodeEnabled = watch('claudeCodeEnabled')
  const opencodeEnabled = watch('opencodeEnabled')
  const openclawEnabled = watch('openclawEnabled')

  // Populate form from existing runtime
  useEffect(() => {
    if (!data?.data) return
    const runtime = data.data
    const spec = runtime.spec
    const type = inferRuntimeType(spec)
    setRuntimeType(type)

    reset({
      runtimeType: type,
      image: spec.image || '',
      claudeCodeEnabled: spec.claudeCode?.enabled,
      claudeCodeApiKeySecretName: spec.claudeCode?.apiKeyRef?.name || '',
      claudeCodeMaxTurns: spec.claudeCode?.maxTurns ? String(spec.claudeCode.maxTurns) : undefined,
      opencodeEnabled: spec.opencode?.enabled,
      opencodeUsername: spec.opencode?.username || '',
      opencodePasswordSecretName: spec.opencode?.passwordRef?.name || '',
      openclawEnabled: spec.openclaw?.enabled,
      openclawTokenSecretName: spec.openclaw?.tokenRef?.name || '',
      workspaceSize: spec.workspace?.size || '',
      workspaceStorageClassName: spec.workspace?.storageClassName || '',
      workspaceMountPath: spec.workspace?.mountPath || '',
      cpuRequest: spec.deployment?.resources?.requests?.['cpu'] || '',
      cpuLimit: spec.deployment?.resources?.limits?.['cpu'] || '',
      memoryRequest: spec.deployment?.resources?.requests?.['memory'] || '',
      memoryLimit: spec.deployment?.resources?.limits?.['memory'] || '',
    })
  }, [data, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await updateRuntime.mutateAsync({
        name,
        formData: {
          name,
          runtimeType: values.runtimeType,
          image: values.image || undefined,
          claudeCodeEnabled: values.claudeCodeEnabled,
          claudeCodeApiKey: values.claudeCodeApiKey || undefined,
          claudeCodeApiKeySecretName: values.claudeCodeApiKeySecretName || undefined,
          claudeCodeMaxTurns: values.claudeCodeMaxTurns ? parseInt(values.claudeCodeMaxTurns, 10) : undefined,
          opencodeEnabled: values.opencodeEnabled,
          opencodeUsername: values.opencodeUsername || undefined,
          opencodePassword: values.opencodePassword || undefined,
          opencodePasswordSecretName: values.opencodePasswordSecretName || undefined,
          openclawEnabled: values.openclawEnabled,
          openclawToken: values.openclawToken || undefined,
          openclawTokenSecretName: values.openclawTokenSecretName || undefined,
          workspaceSize: values.workspaceSize || undefined,
          workspaceStorageClassName: values.workspaceStorageClassName || undefined,
          workspaceMountPath: values.workspaceMountPath || undefined,
          cpuRequest: values.cpuRequest || undefined,
          cpuLimit: values.cpuLimit || undefined,
          memoryRequest: values.memoryRequest || undefined,
          memoryLimit: values.memoryLimit || undefined,
        },
      })
      toast({ title: 'Runtime updated', description: `"${name}" has been updated.` })
      router.push(`/runtimes/${name}`)
    } catch (error) {
      toast({
        title: 'Failed to update runtime',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ResourceHeader
          backHref={`/runtimes/${name}`}
          backLabel={`Back to ${name}`}
          icon={Cpu}
          title="Loading..."
          subtitle="Loading runtime details..."
        />
        <Skeleton className="h-64 w-full" />
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
          <Link href="/runtimes">
            <Button>Back to Runtimes</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        backHref={`/runtimes/${name}`}
        backLabel={`Back to ${name}`}
        icon={Cpu}
        title="Edit Runtime"
        subtitle={name}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identity (name is read-only on edit) */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} disabled className="font-mono" />
              <p className="text-xs text-muted-foreground">Name cannot be changed after creation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="runtimeType">Runtime Type *</Label>
              <Select
                value={runtimeType}
                onValueChange={(v) => {
                  const t = v as RuntimeType
                  setRuntimeType(t)
                  setValue('runtimeType', t)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-code">claude-code</SelectItem>
                  <SelectItem value="opencode">opencode</SelectItem>
                  <SelectItem value="openclaw">openclaw</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Default Image</Label>
              <Input
                id="image"
                placeholder="ghcr.io/example/agent:latest"
                {...register('image')}
              />
            </div>
          </CardContent>
        </Card>

        {runtimeType === 'claude-code' && (
          <Card>
            <CardHeader>
              <CardTitle>Claude Code Config</CardTitle>
              <CardDescription>Credential configuration for Claude Code agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="claudeCodeEnabled"
                  checked={claudeCodeEnabled ?? true}
                  onCheckedChange={(v) => setValue('claudeCodeEnabled', v)}
                />
                <Label htmlFor="claudeCodeEnabled">Enabled</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claudeCodeApiKey">API Key (new value — leave blank to keep existing)</Label>
                <Input
                  id="claudeCodeApiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  {...register('claudeCodeApiKey')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claudeCodeApiKeySecretName">API Key Secret Name</Label>
                <Input
                  id="claudeCodeApiKeySecretName"
                  placeholder="claude-api-key"
                  {...register('claudeCodeApiKeySecretName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claudeCodeMaxTurns">Max Turns</Label>
                <Input
                  id="claudeCodeMaxTurns"
                  type="number"
                  min={1}
                  {...register('claudeCodeMaxTurns')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {runtimeType === 'opencode' && (
          <Card>
            <CardHeader>
              <CardTitle>Opencode Config</CardTitle>
              <CardDescription>Credential configuration for Opencode agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="opencodeEnabled"
                  checked={opencodeEnabled ?? false}
                  onCheckedChange={(v) => setValue('opencodeEnabled', v)}
                />
                <Label htmlFor="opencodeEnabled">Enabled</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opencodeUsername">Username</Label>
                <Input id="opencodeUsername" {...register('opencodeUsername')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opencodePassword">Password (new value — leave blank to keep existing)</Label>
                <Input id="opencodePassword" type="password" {...register('opencodePassword')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opencodePasswordSecretName">Password Secret Name</Label>
                <Input id="opencodePasswordSecretName" {...register('opencodePasswordSecretName')} />
              </div>
            </CardContent>
          </Card>
        )}

        {runtimeType === 'openclaw' && (
          <Card>
            <CardHeader>
              <CardTitle>Openclaw Config</CardTitle>
              <CardDescription>Credential configuration for Openclaw agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="openclawEnabled"
                  checked={openclawEnabled ?? false}
                  onCheckedChange={(v) => setValue('openclawEnabled', v)}
                />
                <Label htmlFor="openclawEnabled">Enabled</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openclawToken">Token (new value — leave blank to keep existing)</Label>
                <Input id="openclawToken" type="password" {...register('openclawToken')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openclawTokenSecretName">Token Secret Name</Label>
                <Input id="openclawTokenSecretName" {...register('openclawTokenSecretName')} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Workspace Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceSize">Size</Label>
                <Input id="workspaceSize" placeholder="10Gi" {...register('workspaceSize')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceStorageClassName">Storage Class</Label>
                <Input id="workspaceStorageClassName" placeholder="standard" {...register('workspaceStorageClassName')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceMountPath">Mount Path</Label>
              <Input id="workspaceMountPath" placeholder="/workspace" {...register('workspaceMountPath')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpuRequest">CPU Request</Label>
                <Input id="cpuRequest" placeholder="100m" {...register('cpuRequest')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpuLimit">CPU Limit</Label>
                <Input id="cpuLimit" placeholder="1000m" {...register('cpuLimit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryRequest">Memory Request</Label>
                <Input id="memoryRequest" placeholder="256Mi" {...register('memoryRequest')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryLimit">Memory Limit</Label>
                <Input id="memoryLimit" placeholder="1Gi" {...register('memoryLimit')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || updateRuntime.isPending}>
            {isSubmitting || updateRuntime.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href={`/runtimes/${name}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
