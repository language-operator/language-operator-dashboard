import { NextRequest, NextResponse } from 'next/server'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { getAuthenticatedUser } from '@/lib/user-context'
import { validateClusterForResourceCreation, validateClusterExists, validateResourceBelongsToCluster } from '@/lib/cluster-validation'
import { createErrorResponse, createSuccessResponse, handleKubernetesOperation, validateClusterNameFormat, ApiError, createAuthenticationRequiredError } from '@/lib/api-error-handler'
import { validateClusterName, safeValidateLanguageAgent } from '@/lib/validation'
import { LanguageAgent, LanguageAgentListParams } from '@/types/agent'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

// GET /api/clusters/[name]/agents - List all agents for specific cluster
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName } = await params

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster exists
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const url = new URL(request.url)
    const queryParams: LanguageAgentListParams = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: (url.searchParams.get('sortBy') as LanguageAgentListParams['sortBy']) || 'name',
      sortOrder: (url.searchParams.get('sortOrder') as LanguageAgentListParams['sortOrder']) || 'asc',
      search: url.searchParams.get('search') || undefined,
      phase: url.searchParams.getAll('phase') || undefined,
    }

    // Fetch all agents from namespace with proper error handling
    const response = await handleKubernetesOperation(
      'list agents',
      client.listLanguageAgents(clusterName)
    )

    // Handle different response structures from k8s client
    const allAgents = extractItems<LanguageAgent>(response)

    // Filter agents to only show those that belong to this specific cluster
    const clusterAgents = validateResourceBelongsToCluster(
      allAgents,
      clusterName,
      { allowOrphanedResources: true }
    ) as LanguageAgent[]

    // Apply search filtering
    let filteredAgents = clusterAgents.filter((agent: LanguageAgent) => {
      if (queryParams.search) {
        const searchLower = queryParams.search.toLowerCase()
        const nameMatch = agent.metadata.name?.toLowerCase().includes(searchLower)
        const instructionsMatch = agent.spec.instructions?.toLowerCase().includes(searchLower)
        if (!nameMatch && !instructionsMatch) return false
      }

      if (queryParams.phase && queryParams.phase.length > 0) {
        if (!queryParams.phase.includes(agent.status?.phase || '')) return false
      }

      return true
    })

    // Apply sorting
    filteredAgents.sort((a: LanguageAgent, b: LanguageAgent) => {
      const order = queryParams.sortOrder === 'desc' ? -1 : 1

      switch (queryParams.sortBy) {
        case 'name':
          return (a.metadata.name || '').localeCompare(b.metadata.name || '') * order
        case 'phase':
          return ((a.status?.phase || '').localeCompare(b.status?.phase || '')) * order
        case 'age':
          const aTime = a.metadata.creationTimestamp ? new Date(a.metadata.creationTimestamp).getTime() : 0
          const bTime = b.metadata.creationTimestamp ? new Date(b.metadata.creationTimestamp).getTime() : 0
          return (bTime - aTime) * order
        default:
          return 0
      }
    })

    // Apply pagination
    const startIndex = ((queryParams.page || 1) - 1) * (queryParams.limit || 50)
    const endIndex = startIndex + (queryParams.limit || 50)
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex)

    return createSuccessResponse(paginatedAgents, undefined, {
      total: filteredAgents.length,
      page: queryParams.page || 1,
      limit: queryParams.limit || 50,
      cluster: clusterName,
    })

  } catch (error) {
    console.error('Error fetching cluster agents:', error)
    return createErrorResponse(error, 'Failed to fetch agents for cluster')
  }
}

// POST /api/clusters/[name]/agents - Create new agent for specific cluster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName } = await params

    // Validate cluster name format and existence
    validateClusterNameFormat(clusterName)
    await validateClusterForResourceCreation(NAMESPACE, clusterName, 'LanguageAgent')

    const agentData = await request.json()

    // Build the LanguageAgent CRD matching the exact operator spec
    const agentCrd: LanguageAgent = {
      apiVersion: 'langop.io/v1alpha1',
      kind: 'LanguageAgent',
      metadata: {
        name: agentData.name,
        namespace: clusterName,
        labels: {},
        annotations: {
          'langop.io/created-by': userId,
        },
      },
      spec: {
        instructions: agentData.instructions,

        // Runtime preset (optional)
        ...(agentData.runtime && { runtime: agentData.runtime }),

        // Model references — operator uses spec.models
        models: agentData.selectedModels?.map((name: string) => ({ name })) || [],

        // Tool references — operator uses spec.tools
        ...(agentData.selectedTools?.length > 0 && {
          tools: agentData.selectedTools.map((name: string) => ({ name })),
        }),

        // Persona — operator uses spec.persona (string name)
        ...(agentData.selectedPersona && agentData.selectedPersona !== 'none' && {
          persona: agentData.selectedPersona,
        }),

        // Workspace retain — only set when explicitly enabled
        ...(agentData.workspaceRetain && {
          workspace: { retain: true },
        }),

        // Self-configuration permissions
        ...(agentData.selfConfigure && {
          selfConfigure: agentData.selfConfigure,
        }),
      },
    }

    // Validate the complete agent CRD structure
    const validationResult = safeValidateLanguageAgent(agentCrd)
    if (!validationResult.success) {
      throw new ApiError(
        'Invalid agent configuration',
        'VALIDATION_ERROR',
        400,
        'Agent data does not match required schema',
        { validationErrors: validationResult.error.issues }
      )
    }

    // Create the agent using k8s client with proper error handling
    const result = await handleKubernetesOperation(
      'create agent',
      client.createLanguageAgent(clusterName, agentCrd)
    )

    return createSuccessResponse(
      result,
      `Agent "${agentData.name}" created successfully in cluster "${clusterName}"`
    )

  } catch (error) {
    console.error('Error creating agent:', error)
    return createErrorResponse(error, 'Failed to create agent')
  }
}
