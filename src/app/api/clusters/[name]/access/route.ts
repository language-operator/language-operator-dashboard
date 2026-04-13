import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItems } from '@/lib/k8s-client'
import { createErrorResponse, validateClusterNameFormat } from '@/lib/api-error-handler'
import * as k8s from '@kubernetes/client-node'
import type { RbacV1Subject } from '@kubernetes/client-node'
import { validateClusterExists } from '@/lib/cluster-validation'

const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: clusterName } = await params
    await getAuthenticatedUser(request)
    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName)

    const response = await k8sClient.listRoleBindings(clusterName)
    const items = extractItems<k8s.V1RoleBinding>(response)

    // Normalise to a stable shape for the UI
    const bindings = items
      .filter((b: k8s.V1RoleBinding) => ['langop-cluster-admin', 'langop-cluster-viewer'].includes(b.roleRef?.name ?? ''))
      .map((b: k8s.V1RoleBinding) => ({
        name: b.metadata?.name,
        role: b.roleRef?.name,
        subjects: (b.subjects ?? []).map((s: RbacV1Subject) => ({ kind: s.kind, name: s.name })),
        createdAt: b.metadata?.creationTimestamp,
      }))

    return NextResponse.json({ success: true, data: bindings })
  } catch (error) {
    return createErrorResponse(error, 'Failed to fetch access bindings')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: clusterName } = await params
    const { email } = await getAuthenticatedUser(request)
    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName)

    const { userEmail, role } = await request.json()

    if (!userEmail || typeof userEmail !== 'string') {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 })
    }
    if (!['langop-cluster-admin', 'langop-cluster-viewer'].includes(role)) {
      return NextResponse.json({ error: 'role must be langop-cluster-admin or langop-cluster-viewer' }, { status: 400 })
    }

    const bindingName = `${role}-${userEmail.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`

    await k8sClient.createRoleBinding(clusterName, {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      metadata: {
        name: bindingName,
        namespace: clusterName,
        annotations: { 'langop.io/granted-by': email },
      },
      subjects: [{ kind: 'User', name: userEmail, apiGroup: 'rbac.authorization.k8s.io' }],
      roleRef: { kind: 'Role', name: role, apiGroup: 'rbac.authorization.k8s.io' },
    })

    console.log(`User ${email} granted ${role} to ${userEmail} in cluster ${clusterName}`)
    return NextResponse.json({ success: true, data: { name: bindingName, role, userEmail } })
  } catch (error) {
    return createErrorResponse(error, 'Failed to create access binding')
  }
}
