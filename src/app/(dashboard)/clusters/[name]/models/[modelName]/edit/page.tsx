'use client'

import { useParams, useRouter } from 'next/navigation'
import { ModelForm, ModelFormData } from '@/components/forms/model-form'
import { useModel, useUpdateModel } from '@/hooks/use-models'
import { Skeleton } from '@/components/ui/skeleton'

export default function ClusterEditModelPage() {
  const params = useParams()
  const router = useRouter()
  const clusterName = params.name as string
  const modelName = params.modelName as string
  const { data: modelResponse, isLoading: isLoadingModel } = useModel(modelName, clusterName)
  const model = modelResponse?.data

  const updateModel = useUpdateModel(clusterName)

  const handleSubmit = async (formData: ModelFormData) => {
    try {
      await updateModel.mutateAsync({
        modelName,
        updateData: {
          name: formData.name,
          namespace: clusterName,
          provider: formData.provider,
          modelName: formData.model,
          endpoint: formData.endpoint || undefined,
          ...(formData.apiKey && {
            apiKeySecretName: formData.apiKey,
          }),
          ...(formData.requestsPerMinute || formData.tokensPerMinute ? {
            requestsPerMinute: formData.requestsPerMinute,
            tokensPerMinute: formData.tokensPerMinute,
          } : {}),
          timeout: formData.timeout || undefined,
        },
      })

      router.push(`/clusters/${clusterName}/models/${modelName}`)
    } catch (err: unknown) {
      console.error('Error updating model:', err)
    }
  }

  const handleCancel = () => {
    router.push(`/clusters/${clusterName}/models/${modelName}`)
  }

  // Populate form with only the fields that exist in the current CRD spec
  const initialData: Partial<ModelFormData> | undefined = model ? {
    name: model.metadata.name,
    provider: model.spec.provider,
    model: model.spec.modelName,
    endpoint: model.spec.endpoint || '',
    timeout: model.spec.timeout || '',
    requestsPerMinute: model.spec.rateLimits?.requestsPerMinute,
    tokensPerMinute: model.spec.rateLimits?.tokensPerMinute,
    // Note: apiKey is intentionally not populated for security reasons
  } : undefined

  if (isLoadingModel) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!model) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <p className="text-gray-600">Model not found</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ModelForm
        initialData={initialData}
        isLoading={updateModel.isPending}
        error={updateModel.error?.message}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={true}
        clusterName={clusterName}
      />
    </div>
  )
}
