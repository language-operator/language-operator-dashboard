import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient } from '@/lib/k8s-client'
import { z } from 'zod'

const updateClusterSchema = z.object({
  domain: z.string().optional(),
  spec: z.object({
    domain: z.string().optional(),
    ingress: z.object({
      enabled: z.boolean()
    }).optional(),
    networkPolicies: z.array(z.object({
      description: z.string().optional(),
      to: z.object({
        dns: z.array(z.string()).optional(),
        cidr: z.string().optional(),
        group: z.string().optional(),
        service: z.object({
          name: z.string(),
          namespace: z.string().optional()
        }).optional(),
        namespaceSelector: z.object({
          matchLabels: z.record(z.string(), z.string())
        }).optional(),
        podSelector: z.object({
          matchLabels: z.record(z.string(), z.string())
        }).optional()
      }).optional(),
      from: z.object({
        dns: z.array(z.string()).optional(),
        cidr: z.string().optional(),
        group: z.string().optional(),
        service: z.object({
          name: z.string(),
          namespace: z.string().optional()
        }).optional(),
        namespaceSelector: z.object({
          matchLabels: z.record(z.string(), z.string())
        }).optional(),
        podSelector: z.object({
          matchLabels: z.record(z.string(), z.string())
        }).optional()
      }).optional(),
      ports: z.array(z.object({
        port: z.number().min(1).max(65535),
        protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP')
      })).optional()
    })).optional()
  }).optional()
})

// GET /api/clusters/[name] - Get a specific cluster
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const cluster = await client.getLanguageCluster(NAMESPACE, name)
    
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }
    
    return NextResponse.json({ cluster })
  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error fetching cluster:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/clusters/[name] - Update a specific cluster
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)
    const body = await request.json()
    const validatedData = updateClusterSchema.parse(body)

    // Get existing cluster
    const existingCluster = await client.getLanguageCluster(NAMESPACE, name)
    if (!existingCluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    // Update the cluster
    const updatedCluster = await client.updateLanguageCluster(NAMESPACE, name, {
      metadata: {
        ...existingCluster.metadata,
        annotations: {
          ...existingCluster.metadata.annotations,
          'langop.io/updated-at': new Date().toISOString(),
          'langop.io/updated-by': userId
        }
      },
      spec: {
        ...existingCluster.spec,
        ...validatedData.spec,
        domain: validatedData.domain || validatedData.spec?.domain
      }
    } as import('@/types/cluster').LanguageCluster)

    console.log(`Cluster updated: ${name} by ${userId} in ${NAMESPACE}`)

    return NextResponse.json({ cluster: updatedCluster })
  } catch (error) {
    console.error('Error updating cluster:', error)
    
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/clusters/[name] - Delete a specific cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    // Check if cluster exists
    const existingCluster = await client.getLanguageCluster(NAMESPACE, name)
    if (!existingCluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    // Delete the cluster
    await client.deleteLanguageCluster(NAMESPACE, name)

    console.log(`Cluster deleted: ${name} by ${userId} in ${NAMESPACE}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    const k8sStatus = (error as { response?: { statusCode?: number } })?.response?.statusCode
    if (k8sStatus === 401 || k8sStatus === 403) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    console.error('Error deleting cluster:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}