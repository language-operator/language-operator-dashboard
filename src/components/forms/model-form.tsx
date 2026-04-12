'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, KeyRound, Gauge } from 'lucide-react'

const PROVIDERS: { id: string; name: string; requiresEndpoint: boolean }[] = [
  { id: 'openai', name: 'OpenAI', requiresEndpoint: false },
  { id: 'anthropic', name: 'Anthropic', requiresEndpoint: false },
  { id: 'openai-compatible', name: 'OpenAI-Compatible (Ollama, vLLM, etc.)', requiresEndpoint: true },
  { id: 'azure', name: 'Azure OpenAI', requiresEndpoint: true },
  { id: 'bedrock', name: 'AWS Bedrock', requiresEndpoint: false },
  { id: 'vertex', name: 'Google Vertex AI', requiresEndpoint: false },
  { id: 'custom', name: 'Custom', requiresEndpoint: true },
]

export interface ModelFormData {
  name: string
  provider: string
  modelName: string
  endpoint?: string
  apiKeySecretName?: string
  apiKeySecretKey?: string
  requestsPerMinute?: number
  tokensPerMinute?: number
  timeout?: string
}

interface ModelFormProps {
  initialData?: Partial<ModelFormData>
  isLoading?: boolean
  error?: string
  onSubmit: (data: ModelFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  clusterName?: string
}

export function ModelForm({
  initialData,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
  isEdit = false,
}: ModelFormProps) {
  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    provider: '',
    modelName: '',
    endpoint: '',
    apiKeySecretName: '',
    apiKeySecretKey: '',
    requestsPerMinute: undefined,
    tokensPerMinute: undefined,
    timeout: '',
    ...initialData,
  })
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const selectedProvider = PROVIDERS.find(p => p.id === formData.provider)

  const validate = (): boolean => {
    if (!formData.name.trim()) {
      setValidationError('Model name is required')
      return false
    }
    if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(formData.name)) {
      setValidationError('Name must be lowercase alphanumeric with hyphens')
      return false
    }
    if (formData.name.length > 63) {
      setValidationError('Name must be 63 characters or less')
      return false
    }
    if (!formData.provider) {
      setValidationError('Provider is required')
      return false
    }
    if (!formData.modelName.trim()) {
      setValidationError('Model identifier is required')
      return false
    }
    if (selectedProvider?.requiresEndpoint && !formData.endpoint?.trim()) {
      setValidationError('Endpoint is required for this provider')
      return false
    }
    if (formData.endpoint?.trim()) {
      try {
        new URL(formData.endpoint)
      } catch {
        setValidationError('Endpoint must be a valid URL')
        return false
      }
    }
    setValidationError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const displayError = error || validationError

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      {/* Core */}
      <Card>
        <CardHeader>
          <CardTitle>Core</CardTitle>
          <CardDescription>Provider and model identifier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Resource Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="my-gpt4-model"
              className="font-mono"
              disabled={isEdit || isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Lowercase alphanumeric + hyphens, max 63 characters. Cannot be changed after creation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={value => setFormData(prev => ({ ...prev, provider: value }))}
                disabled={isLoading}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelName">Model Identifier *</Label>
              <Input
                id="modelName"
                value={formData.modelName}
                onChange={e => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                placeholder="gpt-4o"
                className="font-mono"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exact model name as expected by the provider API
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Credentials
          </CardTitle>
          <CardDescription>
            Reference a Kubernetes Secret containing the API key. The secret must exist in the cluster namespace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiKeySecretName">Secret Name</Label>
              <Input
                id="apiKeySecretName"
                value={formData.apiKeySecretName ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, apiKeySecretName: e.target.value || undefined }))}
                placeholder="my-openai-secret"
                className="font-mono"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKeySecretKey">Secret Key</Label>
              <Input
                id="apiKeySecretKey"
                value={formData.apiKeySecretKey ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, apiKeySecretKey: e.target.value || undefined }))}
                placeholder="api-key"
                className="font-mono"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpoint">
              Endpoint
              {selectedProvider?.requiresEndpoint && ' *'}
            </Label>
            <Input
              id="endpoint"
              value={formData.endpoint ?? ''}
              onChange={e => setFormData(prev => ({ ...prev, endpoint: e.target.value || undefined }))}
              placeholder={
                formData.provider === 'openai-compatible'
                  ? 'http://localhost:11434/v1'
                  : formData.provider === 'azure'
                  ? 'https://<resource>.openai.azure.com/openai/deployments/<deployment>'
                  : 'https://api.example.com/v1'
              }
              className="font-mono"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {selectedProvider?.requiresEndpoint
                ? 'Required for this provider'
                : 'Optional — leave blank to use the provider default'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Limits
          </CardTitle>
          <CardDescription>Optional rate limits and request timeout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestsPerMinute">Requests / Minute</Label>
              <Input
                id="requestsPerMinute"
                type="number"
                min={1}
                value={formData.requestsPerMinute ?? ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  requestsPerMinute: e.target.value ? parseInt(e.target.value) : undefined,
                }))}
                placeholder="60"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokensPerMinute">Tokens / Minute</Label>
              <Input
                id="tokensPerMinute"
                type="number"
                min={1}
                value={formData.tokensPerMinute ?? ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  tokensPerMinute: e.target.value ? parseInt(e.target.value) : undefined,
                }))}
                placeholder="10000"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout</Label>
              <Input
                id="timeout"
                value={formData.timeout ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, timeout: e.target.value || undefined }))}
                placeholder="5m"
                className="font-mono"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">e.g. 30s, 5m, 1h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? isEdit ? 'Updating...' : 'Creating...'
            : isEdit ? 'Update Model' : 'Create Model'}
        </Button>
      </div>
    </form>
  )
}
