import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationContext } from '@/lib/organization-utils'
import { k8sClient } from '@/lib/k8s-client'
import { db } from '@/lib/db'
import { 
  validateOrganizationContext, 
  OrganizationNotFoundError,
  withOrganizationErrorHandler,
  createSuccessResponse
} from '@/lib/api-error-handler'

// GET /api/[org_id]/quota - Get organization ResourceQuota usage
export const GET = withOrganizationErrorHandler(async function(
  request: NextRequest, 
  { params }: { params: Promise<{ org_id: string }> }
) {
  // Extract organization context from middleware
  const context = await getOrganizationContext()
  const resolvedParams = await params
  const urlOrgId = resolvedParams.org_id

  // Validate organization context with enhanced error handling
  validateOrganizationContext(urlOrgId, context?.organizationId, context?.userId)

  // Get organization details
  const organization = await db.organization.findUnique({
    where: { id: context!.organizationId },
    select: { id: true, name: true, namespace: true, plan: true }
  })

  if (!organization) {
    throw new OrganizationNotFoundError(context!.organizationId)
  }

  // Get ResourceQuota usage from Kubernetes
  const quotaUsage = await k8sClient.getResourceQuotaUsage(organization.namespace)
  console.log('[QUOTA API GET] Returning quota for org:', context!.organizationId, JSON.stringify(quotaUsage.quota))

    // Helper function to convert memory values to bytes
    function convertMemoryToBytes(value: string): number {
      if (!value || value === '0') return 0
      
      const num = parseFloat(value.replace(/[^\d.]/g, ''))
      
      if (value.includes('Ki')) return num * 1024
      if (value.includes('Mi')) return num * 1024 * 1024
      if (value.includes('Gi')) return num * 1024 * 1024 * 1024
      if (value.includes('Ti')) return num * 1024 * 1024 * 1024 * 1024
      if (value.includes('k')) return num * 1000
      if (value.includes('M')) return num * 1000 * 1000
      if (value.includes('G')) return num * 1000 * 1000 * 1000
      if (value.includes('T')) return num * 1000 * 1000 * 1000 * 1000
      
      // Assume bytes if no unit
      return num
    }

    // Recalculate percentages correctly (the k8s client calculation is wrong for CPU)
    const correctedPercentUsed: Record<string, number> = {}
    
    Object.entries(quotaUsage.quota).forEach(([resource, limit]) => {
      const used = quotaUsage.used[resource] || '0'
      const limitValue = limit || '0'
      
      if (limitValue === '0') {
        correctedPercentUsed[resource] = 0
        return
      }
      
      // Handle CPU values specifically
      if (resource.includes('cpu') || (!used.includes('i') && !used.includes('B') && !resource.includes('count/'))) {
        // Convert CPU values to millicores for comparison
        const usedMillicores = used.endsWith('m') ? parseInt(used.slice(0, -1)) : parseFloat(used) * 1000
        const limitMillicores = limitValue.endsWith('m') ? parseInt(limitValue.slice(0, -1)) : parseFloat(limitValue) * 1000
        
        if (limitMillicores === 0) {
          correctedPercentUsed[resource] = 0
        } else {
          correctedPercentUsed[resource] = Math.min((usedMillicores / limitMillicores) * 100, 100)
        }
      } else {
        // Handle memory and count values
        if (resource.includes('memory')) {
          // Convert memory values to bytes for comparison
          const usedBytes = convertMemoryToBytes(used)
          const limitBytes = convertMemoryToBytes(limitValue)
          
          if (limitBytes === 0) {
            correctedPercentUsed[resource] = 0
          } else {
            correctedPercentUsed[resource] = Math.min((usedBytes / limitBytes) * 100, 100)
          }
        } else {
          // Handle count values (extract just the number)
          const usedNum = parseFloat(used.replace(/[^\d.]/g, ''))
          const limitNum = parseFloat(limitValue.replace(/[^\d.]/g, ''))
          
          if (limitNum === 0) {
            correctedPercentUsed[resource] = 0
          } else {
            correctedPercentUsed[resource] = Math.min((usedNum / limitNum) * 100, 100)
          }
        }
      }
    })

    // Calculate warnings (80% threshold) using corrected percentages
    const warnings: string[] = []
    Object.entries(correctedPercentUsed).forEach(([resource, percent]) => {
      if (percent >= 80) {
        warnings.push(`${resource}: ${percent.toFixed(1)}% used`)
      }
    })

  return createSuccessResponse({
    organization: {
      id: organization.id,
      name: organization.name,
      namespace: organization.namespace,
      plan: organization.plan
    },
    quota: quotaUsage.quota,
    used: quotaUsage.used,
    available: quotaUsage.available,
    percentUsed: correctedPercentUsed,
    warnings,
    isNearLimit: warnings.length > 0
  })
})

// PUT /api/[org_id]/quota - Update organization quota (plan-based or custom)
export const PUT = withOrganizationErrorHandler(async function(
  request: NextRequest,
  { params }: { params: Promise<{ org_id: string }> }
) {
  // Extract organization context from middleware
  const context = await getOrganizationContext()
  const resolvedParams = await params
  const urlOrgId = resolvedParams.org_id

  // Validate organization context with enhanced error handling
  validateOrganizationContext(urlOrgId, context?.organizationId, context?.userId)

  const body = await request.json()
  const { plan, quotas } = body

  // Must provide either plan OR quotas
  if (!plan && !quotas) {
    return NextResponse.json({
      error: 'Either plan or quotas must be provided'
    }, { status: 400 })
  }

  // Get organization details
  const organization = await db.organization.findUnique({
    where: { id: context!.organizationId },
    select: { id: true, name: true, namespace: true, plan: true }
  })

  if (!organization) {
    throw new OrganizationNotFoundError(context!.organizationId)
  }

    // Note: Permission check for 'manage_billing' is done in middleware
    // Additional checks could be added here if needed

    let newPlan: string

    if (quotas) {
      // Direct quota specification (new approach)
      newPlan = 'custom'

      // Validate quota specification
      const validation = k8sClient.validateQuotaSpec(quotas)
      if (!validation.valid) {
        return NextResponse.json({
          error: 'Invalid quota specification',
          details: validation.errors
        }, { status: 400 })
      }
    } else {
      // Plan-based (legacy approach)
      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }
      newPlan = plan
    }

  // Update database
  await db.organization.update({
    where: { id: context!.organizationId },
    data: { plan: newPlan }
  })

    // Update Kubernetes ResourceQuota
    try {
      console.log('[QUOTA UPDATE] Starting update for org:', context!.organizationId, 'namespace:', organization.namespace)
      if (quotas) {
        // Custom quota specification
        console.log('[QUOTA UPDATE] Using custom quotas:', JSON.stringify(quotas))
        await k8sClient.updateResourceQuotaWithCustomSpec(
          organization.namespace,
          quotas,
          context!.organizationId
        )
        console.log('[QUOTA UPDATE] Custom quota update succeeded')
      } else {
        // Plan-based quota
        console.log('[QUOTA UPDATE] Using plan-based quotas, plan:', plan)
        await k8sClient.updateResourceQuota(organization.namespace, plan, context!.organizationId)
        console.log('[QUOTA UPDATE] Plan-based quota update succeeded')
      }
    } catch (k8sError: any) {
      console.error('[QUOTA UPDATE] Failed to update Kubernetes ResourceQuota:', k8sError.message, k8sError.stack)
      // Rollback database change
      await db.organization.update({
        where: { id: context!.organizationId },
        data: { plan: organization.plan }
      })
      return NextResponse.json({
        error: 'Failed to update Kubernetes quotas',
        details: k8sError.message
      }, { status: 500 })
    }

    // Get updated quota usage
    const quotaUsage = await k8sClient.getResourceQuotaUsage(organization.namespace)

  return createSuccessResponse({
    organization: {
      ...organization,
      plan: newPlan
    },
    quota: quotaUsage.quota,
    used: quotaUsage.used,
    available: quotaUsage.available,
    percentUsed: quotaUsage.percentUsed
  })
})