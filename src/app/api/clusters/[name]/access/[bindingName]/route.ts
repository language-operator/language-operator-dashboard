import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import { createErrorResponse, validateClusterNameFormat } from '@/lib/api-error-handler'
import { validateClusterExists } from '@/lib/cluster-validation'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; bindingName: string }> }
) {
  try {
    const { name: clusterName, bindingName } = await params
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName)

    await client.deleteRoleBinding(clusterName, bindingName)

    console.log(`User ${userId} revoked binding ${bindingName} in cluster ${clusterName}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return createErrorResponse(error, 'Failed to delete access binding')
  }
}
