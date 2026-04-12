'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Cpu } from 'lucide-react'
import { ResourceHeader } from '@/components/ui/resource-header'
import { useCreateRuntime } from '@/hooks/use-runtimes'
import { RuntimeType } from '@/types/runtime'
import { useToast } from '@/hooks/use-toast'

const k8sNameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(63, 'Name must be at most 63 characters')
    .regex(k8sNameRegex, 'Must be a valid Kubernetes name (lowercase alphanumeric and hyphens)'),
  runtimeType: z.enum(['claude-code', 'opencode', 'openclaw', 'custom']),
  image: z.string().optional(),
  // claude-code
  claudeCodeEnabled: z.boolean().optional(),
  claudeCodeApiKey: z.string().optional(),
  claudeCodeApiKeySecretName: z.string().optional(),
  claudeCodeMaxTurns: z.string().optional(),
  // opencode
  opencodeEnabled: z.boolean().optional(),
  opencodeUsername: z.string().optional(),
  opencodePassword: z.string().optional(),
  opencodePasswordSecretName: z.string().optional(),
  // openclaw
  openclawEnabled: z.boolean().optional(),
  openclawToken: z.string().optional(),
  openclawTokenSecretName: z.string().optional(),
  // workspace
  workspaceSize: z.string().optional(),
  workspaceStorageClassName: z.string().optional(),
  workspaceMountPath: z.string().optional(),
  // deployment resources
  cpuRequest: z.string().optional(),
  cpuLimit: z.string().optional(),
  memoryRequest: z.string().optional(),
  memoryLimit: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewRuntimePage() {
  const router = useRouter()
  const { toast } = useToast()
  const createRuntime = useCreateRuntime()
  const [runtimeType, setRuntimeType] = useState<RuntimeType>('claude-code')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      runtimeType: 'claude-code',
      claudeCodeEnabled: true,
    },
  })

  const claudeCodeEnabled = watch('claudeCodeEnabled')
  const opencodeEnabled = watch('opencodeEnabled')
  const openclawEnabled = watch('openclawEnabled')

  const onSubmit = async (values: FormValues) => {
    try {
      await createRuntime.mutateAsync({
        name: values.name,
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
      })
      toast({ title: 'Runtime created', description: `"${values.name}" has been created.` })
      router.push('/runtimes')
    } catch (error) {
      toast({
        title: 'Failed to create runtime',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        backHref="/runtimes"
        backLabel="Back to Runtimes"
        icon={Cpu}
        title="Create Runtime"
        subtitle="Define a cluster-wide agent runtime preset"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="my-runtime"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
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
              <p className="text-xs text-muted-foreground">
                Container image agents will use unless overridden
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credential Config — conditional on type */}
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
                <Label htmlFor="claudeCodeApiKey">API Key (inline)</Label>
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
                <p className="text-xs text-muted-foreground">
                  Name of a Kubernetes Secret containing the API key (takes precedence over inline value)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claudeCodeMaxTurns">Max Turns</Label>
                <Input
                  id="claudeCodeMaxTurns"
                  type="number"
                  min={1}
                  placeholder="10"
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
                <Input
                  id="opencodeUsername"
                  placeholder="user@example.com"
                  {...register('opencodeUsername')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opencodePassword">Password (inline)</Label>
                <Input
                  id="opencodePassword"
                  type="password"
                  {...register('opencodePassword')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opencodePasswordSecretName">Password Secret Name</Label>
                <Input
                  id="opencodePasswordSecretName"
                  placeholder="opencode-password"
                  {...register('opencodePasswordSecretName')}
                />
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
                <Label htmlFor="openclawToken">Token (inline)</Label>
                <Input
                  id="openclawToken"
                  type="password"
                  {...register('openclawToken')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openclawTokenSecretName">Token Secret Name</Label>
                <Input
                  id="openclawTokenSecretName"
                  placeholder="openclaw-token"
                  {...register('openclawTokenSecretName')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workspace Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Defaults</CardTitle>
            <CardDescription>Default persistent workspace configuration for agents using this runtime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workspaceSize">Size</Label>
                <Input
                  id="workspaceSize"
                  placeholder="10Gi"
                  {...register('workspaceSize')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceStorageClassName">Storage Class</Label>
                <Input
                  id="workspaceStorageClassName"
                  placeholder="standard"
                  {...register('workspaceStorageClassName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceMountPath">Mount Path</Label>
              <Input
                id="workspaceMountPath"
                placeholder="/workspace"
                {...register('workspaceMountPath')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Deployment Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Defaults</CardTitle>
            <CardDescription>Default CPU and memory requests/limits for agents using this runtime</CardDescription>
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
          <Button type="submit" disabled={isSubmitting || createRuntime.isPending}>
            {isSubmitting || createRuntime.isPending ? 'Creating...' : 'Create Runtime'}
          </Button>
          <Link href="/runtimes">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
