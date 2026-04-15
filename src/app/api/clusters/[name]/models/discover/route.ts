import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { validateClusterExists } from '@/lib/cluster-validation'
import { validateClusterNameFormat } from '@/lib/api-error-handler'

// POST /api/clusters/[name]/models/discover - Discover available models from an endpoint
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'

interface ModelEntry { id?: string; name?: string }


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: clusterName } = await params
    
    // Validate cluster name format
    validateClusterNameFormat(clusterName)
    
    await getAuthenticatedUser(request)

    // Validate cluster exists and user has access
    await validateClusterExists(NAMESPACE, clusterName, { validateAccess: true })

    const body = await request.json()
    const { endpoint, provider, apiKey } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' }, 
        { status: 400 }
      )
    }

    // Validate endpoint URL
    try {
      new URL(endpoint)
    } catch {
      return NextResponse.json(
        { error: 'Invalid endpoint URL' }, 
        { status: 400 }
      )
    }

    let models: string[] = []

    try {
      // Try to fetch models from the endpoint
      if (provider === 'openai-compatible' || provider === 'openai') {
        // Try OpenAI-compatible /v1/models endpoint
        const modelsUrl = endpoint.endsWith('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`
        
        console.log(`🔍 Discovering models for cluster ${clusterName} from: ${modelsUrl}`)
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }

        const response = await fetch(modelsUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        console.log(`📡 Response status: ${response.status} for ${modelsUrl}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`📊 Response data:`, data)
          
          const isDefined = (m: string | undefined): m is string => Boolean(m)
          // OpenAI-compatible format: { data: [{ id: "model-name", ... }] }
          if (data.data && Array.isArray(data.data)) {
            models = data.data.map((model: ModelEntry) => model.id || model.name).filter(isDefined)
          }
          // Some providers return different formats
          else if (data.models && Array.isArray(data.models)) {
            models = data.models.map((model: ModelEntry | string) =>
              typeof model === 'string' ? model : model.id || model.name
            ).filter(isDefined)
          }
          // Direct array format
          else if (Array.isArray(data)) {
            models = data.map((model: ModelEntry | string) =>
              typeof model === 'string' ? model : model.id || model.name
            ).filter(isDefined)
          }
        } else {
          console.error(`❌ Failed to fetch models: ${response.status} ${response.statusText}`)
        }
      } else if (provider === 'anthropic') {
        // Anthropic doesn't have a models discovery endpoint
        // Return common Claude models
        models = [
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229', 
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ]
      }
    } catch (error) {
      console.error('❌ Failed to fetch models from endpoint:', error)
    }

    console.log(`✅ Discovered ${models.length} models for cluster ${clusterName}:`, models)

    return NextResponse.json({
      success: true,
      models: models.slice(0, 50), // Limit to 50 models for performance
      endpoint,
      provider,
      cluster: clusterName,
    })

  } catch (error) {
    console.error('Error discovering models:', error)
    return NextResponse.json(
      { error: 'Failed to discover models' },
      { status: 500 }
    )
  }
}