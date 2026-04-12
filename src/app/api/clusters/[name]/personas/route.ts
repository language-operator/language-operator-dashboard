import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import { filterByClusterRef } from '@/lib/cluster-utils'
import { validateClusterForResourceCreation, validateClusterExists, validateResourceBelongsToCluster } from '@/lib/cluster-validation'
import { createErrorResponse, createSuccessResponse, handleKubernetesOperation, validateClusterNameFormat, ApiError, createAuthenticationRequiredError, createPermissionDeniedError } from '@/lib/api-error-handler'
import { safeValidateLanguagePersona } from '@/lib/validation'
import { LanguagePersona, LanguagePersonaListParams, LanguagePersonaFormData } from '@/types/persona'

// GET /api/clusters/[name]/personas - List personas for a specific cluster
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    


    const { name: clusterName } = await params
    
    // Validate cluster name format
    validateClusterNameFormat(clusterName)
    
    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const url = new URL(request.url)
    const queryParams: LanguagePersonaListParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: (url.searchParams.get('sortBy') as any) || 'name',
      sortOrder: (url.searchParams.get('sortOrder') as any) || 'asc',
      search: url.searchParams.get('search') || undefined,
      tone: url.searchParams.getAll('tone') || undefined,
      phase: url.searchParams.getAll('phase') || undefined,
    }

    // Fetch all personas from cluster namespace with proper error handling
    const response = await handleKubernetesOperation(
      'list personas',
      k8sClient.listLanguagePersonas(clusterName)
    )
    
    // Handle different response structures from k8s client
    const allPersonas = (response as any)?.items || (response.data as any)?.items || (response.body as any)?.items || []

    // Filter personas to only show those that belong to this specific cluster
    // Uses validation to handle orphaned resources gracefully
    const clusterPersonas = validateResourceBelongsToCluster(
      allPersonas, 
      clusterName, 
      { allowOrphanedResources: true }
    ) as LanguagePersona[]

    // Apply search filtering
    let filteredPersonas = clusterPersonas.filter((persona: LanguagePersona) => {
      if (queryParams.search) {
        const searchLower = queryParams.search.toLowerCase()
        const nameMatch = persona.metadata.name?.toLowerCase().includes(searchLower)
        const personalityMatch = persona.spec.personality?.toLowerCase().includes(searchLower)
        const expertiseMatch = persona.spec.expertise?.toLowerCase().includes(searchLower)
        if (!nameMatch && !personalityMatch && !expertiseMatch) return false
      }

      if (queryParams.tone && queryParams.tone.length > 0) {
        if (!queryParams.tone.includes(persona.spec.tone || '')) return false
      }
      
      if (queryParams.phase && queryParams.phase.length > 0) {
        if (!queryParams.phase.includes(persona.status?.phase || '')) return false
      }
      
      return true
    })

    // Apply sorting
    filteredPersonas.sort((a: LanguagePersona, b: LanguagePersona) => {
      const order = queryParams.sortOrder === 'desc' ? -1 : 1
      
      switch (queryParams.sortBy) {
        case 'name':
          return (a.metadata.name || '').localeCompare(b.metadata.name || '') * order
        case 'tone':
          return ((a.spec.tone || '').localeCompare(b.spec.tone || '')) * order
        case 'phase':
          return ((a.status?.phase || '').localeCompare(b.status?.phase || '')) * order
        case 'age':
          const aTime = a.metadata.creationTimestamp ? new Date(a.metadata.creationTimestamp).getTime() : 0
          const bTime = b.metadata.creationTimestamp ? new Date(b.metadata.creationTimestamp).getTime() : 0
          return (bTime - aTime) * order // Default newest first, reverse for oldest first
        default:
          return 0
      }
    })

    // Apply pagination
    const startIndex = ((queryParams.page || 1) - 1) * (queryParams.limit || 50)
    const endIndex = startIndex + (queryParams.limit || 50)
    const paginatedPersonas = filteredPersonas.slice(startIndex, endIndex)

    return createSuccessResponse(paginatedPersonas, undefined, {
      total: filteredPersonas.length,
      page: queryParams.page || 1,
      limit: queryParams.limit || 50,
      cluster: clusterName,
    })

  } catch (error) {
    console.error('Error fetching cluster personas:', error)
    return createErrorResponse(error, 'Failed to fetch personas for cluster')
  }
}

// POST /api/clusters/[name]/personas - Create new persona for specific cluster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    


    const { name: clusterName } = await params
    
    // Validate cluster name format and existence
    validateClusterNameFormat(clusterName)
    await validateClusterForResourceCreation(NAMESPACE, clusterName, 'LanguagePersona')

    const formData: LanguagePersonaFormData = await request.json()
    
    // Create persona with cluster reference
    const persona: LanguagePersona = {
      apiVersion: 'langop.io/v1alpha1',
      kind: 'LanguagePersona',
      metadata: {
        name: formData.name,
        namespace: clusterName,
        labels: {
          'langop.io/cluster': clusterName,
        },
        annotations: {
          'langop.io/created-by-email': email,
          'langop.io/created-at': new Date().toISOString(),
        },
      },
      spec: {
        ...(formData.tone && { tone: formData.tone }),
        ...(formData.personality && { personality: formData.personality }),
        ...(formData.expertise && { expertise: formData.expertise }),
      },
    }

    // Validate the complete persona CRD structure
    const validationResult = safeValidateLanguagePersona(persona)
    if (!validationResult.success) {
      throw new ApiError(
        'Invalid persona configuration',
        'VALIDATION_ERROR',
        400,
        'Persona data does not match required schema',
        { validationErrors: validationResult.error.issues }
      )
    }

    // Create the persona using k8s client with proper error handling
    const result = await handleKubernetesOperation(
      'create persona',
      k8sClient.createLanguagePersona(clusterName, persona)
    )

    return createSuccessResponse(
      result,
      `Persona "${formData.name}" created successfully in cluster "${clusterName}"`
    )

  } catch (error) {
    console.error('Error creating persona:', error)
    return createErrorResponse(error, 'Failed to create persona')
  }
}