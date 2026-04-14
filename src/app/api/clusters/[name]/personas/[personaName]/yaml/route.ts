import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import type { LanguagePersona } from '@/types/persona'
import { validateClusterExists } from '@/lib/cluster-validation'
import {
  createErrorResponse,
  handleKubernetesOperation,
  validateClusterNameFormat,
} from '@/lib/api-error-handler'
import yaml from 'js-yaml'

// GET /api/clusters/[name]/personas/[personaName]/yaml - Get persona YAML
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; personaName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    

    const { name: clusterName, personaName } = await params

    // Validate cluster name format
    validateClusterNameFormat(clusterName)

    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    // Fetch specific persona from cluster namespace
    const response = await handleKubernetesOperation(
      'get persona for YAML',
      k8sClient.getLanguagePersona(clusterName, personaName)
    )

    const persona = extractItem<LanguagePersona>(response)

    if (!persona) {
      return createErrorResponse(
        new Error(`Persona '${personaName}' not found`),
        'Persona not found'
      )
    }

    // Verify persona belongs to user's organization
    const personaOrgLabel = persona.metadata?.labels?.['langop.io/organization-id']
    if (personaOrgLabel && personaOrgLabel !== '') {
      return createErrorResponse(
        new Error(`Persona '${personaName}' not found`),
        'Persona not found'
      )
    }

    // Convert persona object to YAML
    const yamlContent = yaml.dump(persona, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false,
    })

    // Return as plain text with appropriate content-type
    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error fetching persona YAML:', error)
    return createErrorResponse(error, 'Failed to fetch persona YAML')
  }
}