import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import { createErrorResponse, createSuccessResponse, handleKubernetesOperation, validateClusterNameFormat, createAuthenticationRequiredError, createPermissionDeniedError } from '@/lib/api-error-handler'
import { validateClusterExists } from '@/lib/cluster-validation'

// GET /api/clusters/[name]/tools/[toolName] - Get a specific tool in a cluster
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; toolName: string }> }
) {
  try {
    const { name: clusterName, toolName } = await params
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    // Get the specific tool
    const response = await handleKubernetesOperation(
      'get tool',
      client.getLanguageTool(clusterName, toolName)
    )
    
    if (!response) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    
    return createSuccessResponse(response, undefined, { cluster: clusterName })
    
  } catch (error) {
    console.error('Error fetching cluster tool:', error)
    return createErrorResponse(error, 'Failed to fetch tool')
  }
}

// PUT /api/clusters/[name]/tools/[toolName] - Update a specific tool in a cluster
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; toolName: string }> }
) {
  try {
    const { name: clusterName, toolName } = await params
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    // Parse request body
    let updateData
    try {
      updateData = await request.json()
    } catch {
      return createErrorResponse(new Error('Invalid JSON in request body'), 'Invalid JSON in request body')
    }

    // Get existing tool to validate it exists and belongs to the cluster
    const existingTool = await handleKubernetesOperation(
      'get existing tool',
      client.getLanguageTool(clusterName, toolName)
    )
    
    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Build update payload focusing on editable fields
    const updatedTool = {
      ...existingTool,
      spec: {
        ...existingTool.spec,
        // Update container image if provided
        ...(updateData.image && { image: updateData.image }),
        // Update port configuration
        ...(updateData.port && { port: updateData.port }),
        // Update deployment mode
        ...(updateData.deploymentMode && { deploymentMode: updateData.deploymentMode }),
      }
    }

    // Update the tool via Kubernetes API using replace (not patch)
    const updatedResult = await handleKubernetesOperation(
      'update tool',
      client.replaceLanguageTool(clusterName, toolName, updatedTool)
    )

    // Log the update for audit trail
    console.log(`Tool updated: ${toolName} in cluster ${clusterName} by ${userId}`)

    return createSuccessResponse(updatedResult, undefined, { cluster: clusterName })
    
  } catch (error) {
    console.error('Error updating cluster tool:', error)
    return createErrorResponse(error, 'Failed to update tool')
  }
}

// DELETE /api/clusters/[name]/tools/[toolName] - Delete a specific tool in a cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; toolName: string }> }
) {
  try {
    const { name: clusterName, toolName } = await params
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    // Check if tool exists
    const existingTool = await handleKubernetesOperation(
      'get existing tool',
      client.getLanguageTool(clusterName, toolName)
    )

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Delete the tool
    await handleKubernetesOperation(
      'delete tool',
      client.deleteLanguageTool(clusterName, toolName)
    )

    // Log the deletion for audit trail
    console.log(`Tool deleted: ${toolName} in cluster ${clusterName} by ${userId}`)

    return createSuccessResponse(null, undefined, { cluster: clusterName })
    
  } catch (error) {
    console.error('Error deleting cluster tool:', error)
    return createErrorResponse(error, 'Failed to delete tool')
  }
}