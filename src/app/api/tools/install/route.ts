import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { fetchToolCatalog, getToolById, prepareCatalogEntryForInstallation } from '@/lib/tool-catalog'
import { k8sClient } from '@/lib/k8s-client'
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function POST(request: NextRequest) {
  try {
    const { userId, k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const body = await request.json()
    const { toolId, clusterName } = body

    if (!toolId) {
      return NextResponse.json(
        { error: 'Missing required field: toolId' },
        { status: 400 }
      )
    }

    // Fetch the tool from catalog
    const catalog = await fetchToolCatalog()
    const tool = getToolById(catalog, toolId)

    if (!tool) {
      return NextResponse.json(
        { error: `Tool "${toolId}" not found in catalog` },
        { status: 404 }
      )
    }

    // Prepare catalog entry for installation (inject namespace, clusterRef, labels)
    const languageTool = prepareCatalogEntryForInstallation(tool, NAMESPACE, clusterName)
    
    // Add organization and user labels
    if (!languageTool.metadata) {
      languageTool.metadata = {}
    }
    if (!languageTool.metadata.labels) {
      languageTool.metadata.labels = {}
    }
    languageTool.metadata.labels['langop.io/organization-id'] = ''
    languageTool.metadata.labels['langop.io/created-by'] = userId

    if (!languageTool.metadata.annotations) {
      languageTool.metadata.annotations = {}
    }
    languageTool.metadata.annotations['langop.io/created-by'] = userId
    languageTool.metadata.annotations['langop.io/created-at'] = new Date().toISOString()

    try {
      // Apply the LanguageTool CRD to Kubernetes
      const response = await client.createLanguageTool(NAMESPACE, languageTool)

      return NextResponse.json({
        success: true,
        message: 'Tool installed successfully',
        tool: response,
      })
    } catch (k8sError: any) {
      // Check if tool already exists
      if (k8sError.code === 409 || k8sError.response?.statusCode === 409) {
        return NextResponse.json(
          { error: 'Tool already installed' },
          { status: 409 }
        )
      }

      console.error('Kubernetes API error:', k8sError)
      return NextResponse.json(
        { 
          error: 'Failed to install tool',
          details: k8sError.body?.message || k8sError.message 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error installing tool:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to install tool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}