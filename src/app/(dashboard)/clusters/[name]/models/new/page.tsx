'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ModelForm, ModelFormData } from '@/components/forms/model-form'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Cpu } from 'lucide-react'

export default function CreateClusterModelPage() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (formData: ModelFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const payload = {
        name: formData.name,
        provider: formData.provider,
        modelName: formData.modelName,
        ...(formData.endpoint && { endpoint: formData.endpoint }),
        ...(formData.apiKeySecretName && {
          apiKeySecretName: formData.apiKeySecretName,
          apiKeySecretKey: formData.apiKeySecretKey,
        }),
        ...(formData.requestsPerMinute && { requestsPerMinute: formData.requestsPerMinute }),
        ...(formData.tokensPerMinute && { tokensPerMinute: formData.tokensPerMinute }),
        ...(formData.timeout && { timeout: formData.timeout }),
      }

      const response = await fetch(`/api/clusters/${clusterName}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create model')
      }

      router.push(`/clusters/${clusterName}/models`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create model')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/clusters/${clusterName}/models`)
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        backHref={`/clusters/${clusterName}/models`}
        backLabel="Back to Models"
        icon={Cpu}
        title="Create Language Model"
        subtitle={`Add a new language model to the ${clusterName} cluster`}
      />

      <div className="max-w-2xl">
        <ModelForm
          isLoading={isLoading}
          error={error}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          clusterName={clusterName}
        />
      </div>
    </div>
  )
}
