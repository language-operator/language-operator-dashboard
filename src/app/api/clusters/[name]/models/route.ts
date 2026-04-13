import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { filterByClusterRef } from '@/lib/cluster-utils'
import { validateClusterExists, validateResourceBelongsToCluster } from '@/lib/cluster-validation'
import { createErrorResponse, createSuccessResponse, handleKubernetesOperation, validateClusterNameFormat, createAuthenticationRequiredError, createPermissionDeniedError, KubernetesError } from '@/lib/api-error-handler'
import { LanguageModel, LanguageModelListParams } from '@/types/model'

// GET /api/clusters/[name]/models - List models for a specific cluster
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    

    // Check permissions

    const { name: clusterName } = await params
    
    // Validate cluster name format
    validateClusterNameFormat(clusterName)
    
    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    // Parse query parameters
    const url = new URL(request.url)
    const listParams: LanguageModelListParams = {
      namespace: clusterName,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: (url.searchParams.get('sortBy') as LanguageModelListParams['sortBy']) || 'name',
      sortOrder: (url.searchParams.get('sortOrder') as LanguageModelListParams['sortOrder']) || 'asc',
      search: url.searchParams.get('search') || undefined,
      provider: url.searchParams.getAll('provider') || undefined,
      phase: url.searchParams.getAll('phase') || undefined,
    }

    // Fetch models from Kubernetes namespace with proper error handling
    console.log(`Fetching models for cluster ${clusterName} from namespace:`, clusterName)

    const response = await handleKubernetesOperation(
      'list models',
      k8sClient.listLanguageModels(clusterName)
    )
    
    // Handle different response structures
    const allModels = extractItems<LanguageModel>(response)
    
    // Filter models that belong to this specific cluster
    // Uses validation to handle orphaned resources gracefully
    const models = validateResourceBelongsToCluster(
      allModels, 
      clusterName, 
      { allowOrphanedResources: true }
    ) as LanguageModel[]
    
    console.log(`Found ${models.length} models for cluster ${clusterName}`)

    // Apply client-side filtering
    let filteredModels = models.filter((model: LanguageModel) => {
      // Search filter
      if (listParams.search) {
        const searchLower = listParams.search.toLowerCase()
        const nameMatch = model.metadata.name?.toLowerCase().includes(searchLower)
        const providerMatch = model.spec.provider?.toLowerCase().includes(searchLower)
        const modelNameMatch = model.spec.modelName?.toLowerCase().includes(searchLower)
        if (!nameMatch && !providerMatch && !modelNameMatch) {
          return false
        }
      }

      // Provider filter
      if (listParams.provider && listParams.provider.length > 0) {
        if (!listParams.provider.includes(model.spec.provider)) {
          return false
        }
      }

      // Phase filter
      if (listParams.phase && listParams.phase.length > 0) {
        if (!listParams.phase.includes(model.status?.phase || '')) {
          return false
        }
      }

      return true
    })

    // Sort models
    filteredModels.sort((a: LanguageModel, b: LanguageModel) => {
      let aValue: string | number, bValue: string | number

      switch (listParams.sortBy) {
        case 'name':
          aValue = a.metadata.name || ''
          bValue = b.metadata.name || ''
          break
        case 'provider':
          aValue = a.spec.provider || ''
          bValue = b.spec.provider || ''
          break
        case 'phase':
          aValue = a.status?.phase || ''
          bValue = b.status?.phase || ''
          break
        case 'age':
          aValue = new Date(a.metadata.creationTimestamp || 0).getTime()
          bValue = new Date(b.metadata.creationTimestamp || 0).getTime()
          break
        default:
          aValue = a.metadata.name || ''
          bValue = b.metadata.name || ''
      }

      if (listParams.sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    })

    // Pagination
    const startIndex = ((listParams.page || 1) - 1) * (listParams.limit || 50)
    const endIndex = startIndex + (listParams.limit || 50)
    const paginatedModels = filteredModels.slice(startIndex, endIndex)

    return createSuccessResponse(paginatedModels, undefined, {
      total: filteredModels.length,
      page: listParams.page || 1,
      limit: listParams.limit || 50,
      cluster: clusterName,
    })

  } catch (error) {
    console.error('Error fetching cluster models:', error)
    return createErrorResponse(error, 'Failed to fetch cluster models')
  }
}

// POST /api/clusters/[name]/models - Create a new model for a specific cluster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    

    // Check permissions

    const { name: clusterName } = await params
    
    // Validate cluster name format
    validateClusterNameFormat(clusterName)
    
    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const body = await request.json()
    
    // Validate required fields
    if (!body.name) {
      return createErrorResponse(
        new Error('Model name is required'),
        'Invalid request data'
      )
    }
    
    if (!body.provider) {
      return createErrorResponse(
        new Error('Provider is required'),
        'Invalid request data'
      )
    }
    
    if (!body.modelName) {
      return createErrorResponse(
        new Error('Model name is required'),
        'Invalid request data'
      )
    }

    // Create model spec matching the exact CRD spec
    const modelSpec = {
      apiVersion: 'langop.io/v1alpha1',
      kind: 'LanguageModel',
      metadata: {
        name: body.name,
        namespace: clusterName,
        labels: {
          'langop.io/cluster': clusterName,
          'langop.io/managed-by': 'language-operator-dashboard'
        }
      },
      spec: {
        provider: body.provider,
        modelName: body.modelName,
        ...(body.endpoint && { endpoint: body.endpoint }),
        ...(body.apiKeySecretName && {
          apiKeySecretRef: {
            name: body.apiKeySecretName,
            ...(body.apiKeySecretKey && { key: body.apiKeySecretKey }),
          }
        }),
        ...((body.requestsPerMinute || body.tokensPerMinute) && {
          rateLimits: {
            ...(body.requestsPerMinute && { requestsPerMinute: body.requestsPerMinute }),
            ...(body.tokensPerMinute && { tokensPerMinute: body.tokensPerMinute }),
          }
        }),
        ...(body.timeout && { timeout: body.timeout }),
      }
    }

    console.log(`Creating model ${body.name} for cluster ${clusterName} in namespace:`, clusterName)
    console.log('Model spec being sent to Kubernetes:', JSON.stringify(modelSpec, null, 2))

    // Create the model in Kubernetes
    const response = await handleKubernetesOperation(
      'create model',
      k8sClient.createLanguageModel(clusterName, modelSpec)
    )
    
    console.log(`Model ${body.name} created successfully for cluster ${clusterName}`)

    return createSuccessResponse(response, 'Model created successfully')

  } catch (error) {
    console.error('Error creating cluster model:', error)
    return createErrorResponse(error, 'Failed to create cluster model')
  }
}