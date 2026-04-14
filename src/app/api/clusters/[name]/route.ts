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
    
    const { email } = await getAuthenticatedUser(request)
    const cluster = await k8sClient.getLanguageCluster(NAMESPACE, name)
    
    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }
    
    return NextResponse.json({ cluster })
  } catch (error) {
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
    const { email } = await getAuthenticatedUser(request)
    const body = await request.json()
    const validatedData = updateClusterSchema.parse(body)

    // Get existing cluster
    const existingCluster = await k8sClient.getLanguageCluster(NAMESPACE, name)
    if (!existingCluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    // Update the cluster
    const updatedCluster = await k8sClient.updateLanguageCluster(NAMESPACE, name, {
      metadata: {
        ...existingCluster.metadata,
        annotations: {
          ...existingCluster.metadata.annotations,
          'langop.io/updated-at': new Date().toISOString(),
          'langop.io/updated-by': email
        }
      },
      spec: {
        ...existingCluster.spec,
        ...validatedData.spec,
        domain: validatedData.domain || validatedData.spec?.domain
      }
    } as import('@/types/cluster').LanguageCluster)

    console.log(`Cluster updated: ${name} by ${email} in ${NAMESPACE}`)

    return NextResponse.json({ cluster: updatedCluster })
  } catch (error) {
    console.error('Error updating cluster:', error)
    
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
    const { email } = await getAuthenticatedUser(request)

    // Check if cluster exists
    const existingCluster = await k8sClient.getLanguageCluster(NAMESPACE, name)
    if (!existingCluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    // Delete the cluster
    await k8sClient.deleteLanguageCluster(NAMESPACE, name)

    console.log(`Cluster deleted: ${name} by ${email} in ${NAMESPACE}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cluster:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}