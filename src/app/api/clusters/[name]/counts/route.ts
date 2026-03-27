import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { validateClusterAccess, getClusterResourceCounts } from '@/lib/cluster-validation'
import { createErrorResponse, createSuccessResponse, validateClusterNameFormat, createAuthenticationRequiredError } from '@/lib/api-error-handler'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

// GET /api/clusters/[name]/counts - Get resource counts for a specific cluster
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: clusterName } = await params

    const { email } = await getAuthenticatedUser(request)

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster access
    await validateClusterAccess(NAMESPACE, clusterName)

    // Get cluster-specific resource counts from Kubernetes
    console.log(`Getting resource counts for cluster ${clusterName} in namespace ${NAMESPACE}`)

    const clusterCounts = await getClusterResourceCounts(NAMESPACE, clusterName)

    return createSuccessResponse(clusterCounts)

  } catch (error) {
    console.error('Error fetching cluster resource counts:', error)
    return createErrorResponse(error, 'Failed to fetch cluster resource counts')
  }
}
