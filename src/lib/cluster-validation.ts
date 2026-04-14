import { k8sClient } from './k8s-client'
import {
  ClusterNotFoundError,
  ClusterAccessDeniedError,
  InvalidClusterNameError,
  OrphanedResourceError,
  validateClusterNameFormat,
  handleKubernetesOperation
} from './api-error-handler'
import type { LanguageCluster } from '@/types/cluster'
import type { LanguageAgent } from '@/types/agent'
import type { LanguageModel } from '@/types/model'
import type { LanguageTool } from '@/types/tool'
import type { LanguagePersona } from '@/types/persona'

export interface ClusterValidationOptions {
  requireClusterRef?: boolean
  allowOrphanedResources?: boolean
  validateAccess?: boolean
}

export interface ClusterValidationResult {
  exists: boolean
  accessible: boolean
  cluster?: LanguageCluster
}

export async function validateClusterExists(
  namespace: string,
  clusterName: string,
  options: ClusterValidationOptions = {}
): Promise<ClusterValidationResult> {
  // First validate the cluster name format
  validateClusterNameFormat(clusterName)

  try {
    // Check if cluster exists in the namespace
    const clusterResponse = await handleKubernetesOperation(
      `get cluster '${clusterName}'`,
      k8sClient.getLanguageCluster(namespace, clusterName)
    )
    const cr = clusterResponse as { body?: LanguageCluster }
    const cluster: LanguageCluster | undefined = cr?.body ?? (clusterResponse as unknown as LanguageCluster | undefined)

    if (!cluster) {
      throw new ClusterNotFoundError(clusterName, namespace)
    }

    // Validate cluster is accessible (not in failed state, etc.)
    const accessible = validateClusterAccessibility(cluster)
    
    if (options.validateAccess && !accessible) {
      throw new ClusterAccessDeniedError(
        clusterName, 
        namespace,
        `Cluster is in '${cluster.status?.phase || 'unknown'}' state`
      )
    }

    return {
      exists: true,
      accessible,
      cluster
    }

  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof ClusterNotFoundError || error instanceof ClusterAccessDeniedError) {
      throw error
    }

    // Handle Kubernetes errors
    console.error(`Error validating cluster ${clusterName}:`, error)
    throw new ClusterNotFoundError(clusterName, namespace, 'Failed to validate cluster existence')
  }
}

export function validateClusterAccessibility(cluster: LanguageCluster): boolean {
  if (!cluster?.status) {
    return true // Allow clusters without status (newly created)
  }

  const phase = cluster.status.phase
  if (!phase) {
    return true // Allow clusters without a phase (newly created)
  }

  // Allow access to clusters in these phases
  const accessiblePhases = ['Ready', 'Pending', 'Scaling']

  return accessiblePhases.includes(phase)
}

export async function validateClusterAccess(
  namespace: string,
  clusterName: string,
): Promise<void> {
  const result = await validateClusterExists(namespace, clusterName, { validateAccess: true })

  if (!result.cluster) {
    throw new ClusterNotFoundError(clusterName, namespace)
  }
  // K8s RBAC via impersonation enforces actual access control
}

// Minimal structural type for cluster-ref validation — intentionally loose to accept
// concrete types like LanguageAgent, LanguageModel, etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClusterRefResource = { metadata?: { name?: string }; kind?: string; spec?: any }

export function validateClusterRef(
  resource: ClusterRefResource,
  expectedClusterName: string,
  options: ClusterValidationOptions = {}
): void {
  if (!resource) {
    throw new Error('Resource is required for cluster reference validation')
  }

  const resourceClusterRef = resource.spec?.clusterRef as string | undefined
  const resourceName = resource.metadata?.name || 'unknown'
  const resourceType = resource.kind || 'Resource'

  // If resource has clusterRef, it must match expected cluster
  if (resourceClusterRef && resourceClusterRef !== expectedClusterName) {
    // Always throw an error for mismatched clusterRef - this resource belongs to a different cluster
    throw new OrphanedResourceError(resourceType, resourceName, resourceClusterRef)
  }
  
  // Check if clusterRef is required
  if (options.requireClusterRef && !resourceClusterRef) {
    throw new InvalidClusterNameError(
      '',
      `${resourceType} '${resourceName}' is missing required clusterRef field`
    )
  }
  
  // If resource has no clusterRef, handle based on requirements
  if (!resourceClusterRef) {
    if (options.requireClusterRef) {
      // Already handled above
      return
    }
    if (!options.allowOrphanedResources) {
      throw new OrphanedResourceError(resourceType, resourceName, 'none')
    }
    // If allowOrphanedResources is true, we still exclude resources without clusterRef
    // from cluster-scoped views to maintain proper separation
    console.warn(
      `Excluding ${resourceType}/${resourceName} with no clusterRef from cluster '${expectedClusterName}'`
    )
    throw new OrphanedResourceError(resourceType, resourceName, 'none')
  }
}

export function validateResourceBelongsToCluster(
  resources: ClusterRefResource[],
  clusterName: string,
  options: ClusterValidationOptions = {}
): ClusterRefResource[] {
  return resources.filter(resource => {
    try {
      validateClusterRef(resource, clusterName, options)
      return true
    } catch (error) {
      if (error instanceof OrphanedResourceError && options.allowOrphanedResources) {
        return false // Exclude orphaned resources
      }
      throw error // Re-throw other validation errors
    }
  })
}

export async function validateClusterForResourceCreation(
  namespace: string,
  clusterName: string,
  resourceType: string
): Promise<void> {
  // Validate cluster exists and is accessible
  const result = await validateClusterExists(namespace, clusterName, { validateAccess: true })
  
  if (!result.accessible) {
    throw new ClusterAccessDeniedError(
      clusterName,
      namespace, 
      `Cannot create ${resourceType} in inaccessible cluster`
    )
  }

  // Check if cluster is in a state that allows resource creation
  const cluster = result.cluster
  const phase = cluster?.status?.phase
  
  if (phase === 'Failed') {
    throw new ClusterAccessDeniedError(
      clusterName,
      namespace,
      `Cannot create ${resourceType} in failed cluster`
    )
  }
}

export function sanitizeClusterName(clusterName: string): string {
  if (!clusterName) return ''
  
  // Remove any characters that aren't lowercase alphanumeric or hyphens
  return clusterName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 253) // Enforce max length
}

export function isValidClusterName(clusterName: string): boolean {
  try {
    validateClusterNameFormat(clusterName)
    return true
  } catch {
    return false
  }
}

export async function getClusterResourceCounts(
  namespace: string,
  clusterName: string,
): Promise<{
  agents: number
  models: number
  tools: number
  personas: number
}> {
  // Validate cluster access first
  await validateClusterAccess(namespace, clusterName)

  const counts = {
    agents: 0,
    models: 0,
    tools: 0,
    personas: 0
  }

  try {
    // Count agents for this cluster
    const agentsResponse = await handleKubernetesOperation(
      'list agents',
      k8sClient.listLanguageAgents(clusterName)
    )

    const ar = agentsResponse as { body?: { items?: LanguageAgent[] }; data?: { items?: LanguageAgent[] }; items?: LanguageAgent[] }
    const agents: LanguageAgent[] = ar?.body?.items ?? ar?.data?.items ?? ar?.items ?? (Array.isArray(agentsResponse) ? agentsResponse as LanguageAgent[] : [])

    counts.agents = validateResourceBelongsToCluster(agents, clusterName, {
      allowOrphanedResources: true
    }).length

  } catch (error) {
    console.error(`Error counting agents for cluster ${clusterName}:`, error)
  }

  try {
    // Count models for this cluster
    const modelsResponse = await handleKubernetesOperation(
      'list models',
      k8sClient.listLanguageModels(clusterName)
    )

    const mr = modelsResponse as { body?: { items?: LanguageModel[] }; data?: { items?: LanguageModel[] }; items?: LanguageModel[] }
    const models: LanguageModel[] = mr?.body?.items ?? mr?.data?.items ?? mr?.items ?? (Array.isArray(modelsResponse) ? modelsResponse as LanguageModel[] : [])

    counts.models = validateResourceBelongsToCluster(models, clusterName, {
      allowOrphanedResources: true
    }).length

  } catch (error) {
    console.error(`Error counting models for cluster ${clusterName}:`, error)
  }

  try {
    // Count tools for this cluster
    const toolsResponse = await handleKubernetesOperation(
      'list tools',
      k8sClient.listLanguageTools(clusterName)
    )

    const tr = toolsResponse as { body?: { items?: LanguageTool[] }; data?: { items?: LanguageTool[] }; items?: LanguageTool[] }
    const tools: LanguageTool[] = tr?.body?.items ?? tr?.data?.items ?? tr?.items ?? (Array.isArray(toolsResponse) ? toolsResponse as LanguageTool[] : [])

    counts.tools = validateResourceBelongsToCluster(tools, clusterName, {
      allowOrphanedResources: true
    }).length

  } catch (error) {
    console.error(`Error counting tools for cluster ${clusterName}:`, error)
  }

  try {
    // Count personas for this cluster
    const personasResponse = await handleKubernetesOperation(
      'list personas',
      k8sClient.listLanguagePersonas(clusterName)
    )

    const pr = personasResponse as { body?: { items?: LanguagePersona[] }; data?: { items?: LanguagePersona[] }; items?: LanguagePersona[] }
    const personas: LanguagePersona[] = pr?.body?.items ?? pr?.data?.items ?? pr?.items ?? (Array.isArray(personasResponse) ? personasResponse as LanguagePersona[] : [])

    counts.personas = validateResourceBelongsToCluster(personas, clusterName, {
      allowOrphanedResources: true
    }).length

  } catch (error) {
    console.error(`Error counting personas for cluster ${clusterName}:`, error)
  }

  return counts
}

