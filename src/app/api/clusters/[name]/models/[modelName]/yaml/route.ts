import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { LanguageModel } from '@/types/model'
import yaml from 'js-yaml'
import { extractK8sStatusCode } from '@/lib/api-error-handler'

// GET /api/clusters/[name]/models/[modelName]/yaml - Get model YAML


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; modelName: string }> }
) {
  try {
    const { k8sToken } = await getAuthenticatedUser(request)
    const client = k8sClient.forToken(k8sToken)

    const { name: clusterName, modelName } = await params
    if (!clusterName || !modelName) {
      return NextResponse.json({ error: 'Cluster name and model name are required' }, { status: 400 })
    }

    // Fetch specific model from cluster namespace
    let model: LanguageModel | null = null

    try {
      const response = await client.getLanguageModel(clusterName, modelName)
      model = extractItem<LanguageModel>(response)
    } catch (k8sError) {
      // If model not found, return 404
      if (k8sError instanceof Error && k8sError.message.includes('404')) {
        return NextResponse.json({ 
          error: 'Model not found',
          details: `Model "${modelName}" not found in cluster "${clusterName}"` 
        }, { status: 404 })
      }
      
      console.error('Error fetching model from Kubernetes:', k8sError)
      throw k8sError
    }

    if (!model) {
      return NextResponse.json({ 
        error: 'Model not found',
        details: `Model "${modelName}" not found in cluster "${clusterName}"` 
      }, { status: 404 })
    }

    // Verify model belongs to user's organization
    const modelOrgLabel = model.metadata?.labels?.['langop.io/organization-id']
    if (modelOrgLabel && modelOrgLabel !== '') {
      return NextResponse.json({ 
        error: 'Model not found',
        details: `Model "${modelName}" not found in cluster "${clusterName}"` 
      }, { status: 404 })
    }

    // Convert model object to YAML
    const yamlContent = yaml.dump(model, {
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
    const k8sStatus = extractK8sStatusCode(error)
    if (k8sStatus === 401) {
      return NextResponse.json({ error: 'Token expired or unauthorized' }, { status: 401 })
    }
    if (k8sStatus === 403) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    console.error('Error fetching model YAML:', error)
    return NextResponse.json({
      error: 'Failed to fetch model YAML',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}