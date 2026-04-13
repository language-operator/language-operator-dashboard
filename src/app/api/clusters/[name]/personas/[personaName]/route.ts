import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { validateClusterExists } from '@/lib/cluster-validation'
import {
  createErrorResponse,
  createSuccessResponse,
  handleKubernetesOperation,
  validateClusterNameFormat,
} from '@/lib/api-error-handler'
import { LanguagePersona } from '@/types/persona'

// GET /api/clusters/[name]/personas/[personaName] - Get a specific persona in a cluster
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; personaName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, personaName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const response = await handleKubernetesOperation(
      'get persona',
      k8sClient.getLanguagePersona(clusterName, personaName)
    )

    const persona = extractItem<LanguagePersona>(response)

    if (!persona) {
      return createErrorResponse(
        new Error(`Persona '${personaName}' not found`),
        'Persona not found'
      )
    }

    return createSuccessResponse({ persona }, undefined, {
      cluster: clusterName,
    })

  } catch (error) {
    console.error('Error fetching cluster persona:', error)
    return createErrorResponse(error, 'Failed to fetch cluster persona')
  }
}

// PATCH /api/clusters/[name]/personas/[personaName] - Update a specific persona in a cluster
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; personaName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, personaName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const body = await request.json()

    // Fetch existing persona to merge with updates
    const existingResponse = await handleKubernetesOperation(
      'get persona for update',
      k8sClient.getLanguagePersona(clusterName, personaName)
    )

    const existingPersona = extractItem<LanguagePersona>(existingResponse)

    if (!existingPersona) {
      return createErrorResponse(
        new Error(`Persona '${personaName}' not found`),
        'Persona not found'
      )
    }

    // Merge updates — only CRD spec fields
    const updatedPersona = {
      ...existingPersona,
      spec: {
        ...existingPersona.spec,
        ...(body.tone !== undefined && { tone: body.tone }),
        ...(body.personality !== undefined && { personality: body.personality }),
        ...(body.expertise !== undefined && { expertise: body.expertise }),
      },
    }

    const response = await handleKubernetesOperation(
      'update persona',
      k8sClient.updateLanguagePersona(clusterName, personaName, updatedPersona)
    )

    console.log(`Successfully updated persona ${personaName} for cluster ${clusterName}`)

    return createSuccessResponse(response, 'Persona updated successfully')

  } catch (error) {
    console.error('Error updating cluster persona:', error)
    return createErrorResponse(error, 'Failed to update cluster persona')
  }
}

// DELETE /api/clusters/[name]/personas/[personaName] - Delete a specific persona in a cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; personaName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)

    const { name: clusterName, personaName } = await params

    validateClusterNameFormat(clusterName)
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const response = await handleKubernetesOperation(
      'delete persona',
      k8sClient.deleteLanguagePersona(clusterName, personaName)
    )

    console.log(`Successfully deleted persona ${personaName} for cluster ${clusterName}`)

    return createSuccessResponse(response, 'Persona deleted successfully')

  } catch (error) {
    console.error('Error deleting cluster persona:', error)
    return createErrorResponse(error, 'Failed to delete cluster persona')
  }
}
