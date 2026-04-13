import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { validateClusterExists } from '@/lib/cluster-validation'
import {
  createErrorResponse,
  createSuccessResponse,
  handleKubernetesOperation,
  validateClusterNameFormat,
} from '@/lib/api-error-handler'
import { z } from 'zod'
import { LanguageModel } from '@/types/model'

// Validation schema — mirrors the 6-field LanguageModelSpec CRD exactly
const updateModelSchema = z.object({
  provider: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  endpoint: z.string().optional(),
  apiKeySecretName: z.string().optional(),
  apiKeySecretKey: z.string().optional(),
  requestsPerMinute: z.number().int().positive().optional(),
  tokensPerMinute: z.number().int().positive().optional(),
  timeout: z.string().optional(),
})

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

// GET /api/clusters/[name]/models/[modelName]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; modelName: string }> }
) {
  try {
    await getAuthenticatedUser(request)

    const { name: clusterName, modelName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const response = await handleKubernetesOperation(
      'get model',
      k8sClient.getLanguageModel(clusterName, modelName)
    )

    const model = extractItem<LanguageModel>(response)

    if (!model) {
      return createErrorResponse(
        new Error(`Model '${modelName}' not found`),
        'Model not found'
      )
    }

    return createSuccessResponse(model, undefined, { cluster: clusterName })
  } catch (error) {
    console.error('Error fetching cluster model:', error)
    return createErrorResponse(error, 'Failed to fetch cluster model')
  }
}

// PUT /api/clusters/[name]/models/[modelName]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; modelName: string }> }
) {
  try {
    await getAuthenticatedUser(request)

    const { name: clusterName, modelName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const body = await request.json()
    const validatedData = updateModelSchema.parse(body)

    // Fetch existing model to merge updates
    const existingResponse = await handleKubernetesOperation(
      'get model for update',
      k8sClient.getLanguageModel(clusterName, modelName)
    )

    const existingModel = extractItem<LanguageModel>(existingResponse)

    if (!existingModel) {
      return createErrorResponse(
        new Error(`Model '${modelName}' not found`),
        'Model not found'
      )
    }

    // Build spec with only the 6 CRD fields
    const updatedSpec: Record<string, unknown> = {
      provider: validatedData.provider ?? existingModel.spec.provider,
      modelName: validatedData.modelName ?? existingModel.spec.modelName,
    }

    // endpoint: prefer submitted value; fall back to existing; omit if empty
    const newEndpoint = validatedData.endpoint !== undefined
      ? validatedData.endpoint
      : existingModel.spec.endpoint
    if (newEndpoint) updatedSpec.endpoint = newEndpoint

    // apiKeySecretRef: prefer submitted values; fall back to existing
    if (validatedData.apiKeySecretName) {
      updatedSpec.apiKeySecretRef = {
        name: validatedData.apiKeySecretName,
        ...(validatedData.apiKeySecretKey && { key: validatedData.apiKeySecretKey }),
      }
    } else if (existingModel.spec.apiKeySecretRef) {
      updatedSpec.apiKeySecretRef = existingModel.spec.apiKeySecretRef
    }

    // rateLimits: prefer submitted values; fall back to existing
    const rpm = validatedData.requestsPerMinute
    const tpm = validatedData.tokensPerMinute
    if (rpm || tpm) {
      updatedSpec.rateLimits = {
        ...(rpm && { requestsPerMinute: rpm }),
        ...(tpm && { tokensPerMinute: tpm }),
      }
    } else if (existingModel.spec.rateLimits) {
      updatedSpec.rateLimits = existingModel.spec.rateLimits
    }

    // timeout: prefer submitted value; fall back to existing
    const newTimeout = validatedData.timeout !== undefined
      ? validatedData.timeout
      : existingModel.spec.timeout
    if (newTimeout) updatedSpec.timeout = newTimeout

    const updatedModel = {
      ...existingModel,
      spec: updatedSpec,
    }

    // Remove read-only metadata fields before replace
    const meta = { ...updatedModel.metadata }
    delete meta.generation
    delete meta.creationTimestamp
    delete meta.uid
    updatedModel.metadata = meta
    delete updatedModel.status

    const response = await handleKubernetesOperation(
      'update model',
      k8sClient.replaceLanguageModel(clusterName, modelName, updatedModel)
    )

    console.log(`Successfully updated model ${modelName} for cluster ${clusterName}`)
    return createSuccessResponse(response, 'Model updated successfully')
  } catch (error) {
    console.error('Error updating cluster model:', error)
    return createErrorResponse(error, 'Failed to update cluster model')
  }
}

// DELETE /api/clusters/[name]/models/[modelName]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; modelName: string }> }
) {
  try {
    await getAuthenticatedUser(request)

    const { name: clusterName, modelName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const response = await handleKubernetesOperation(
      'delete model',
      k8sClient.deleteLanguageModel(clusterName, modelName)
    )

    console.log(`Successfully deleted model ${modelName} for cluster ${clusterName}`)
    return createSuccessResponse(response, 'Model deleted successfully')
  } catch (error) {
    console.error('Error deleting cluster model:', error)
    return createErrorResponse(error, 'Failed to delete cluster model')
  }
}
