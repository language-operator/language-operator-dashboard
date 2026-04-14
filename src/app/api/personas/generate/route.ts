import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { 
  createErrorResponse, 
  createAuthenticationRequiredError, 
  createPermissionDeniedError,
  ModelNotAvailableError,
  ModelEndpointError,
  ModelResponseError,
  GenerationParsingError,
  GenerationTimeoutError
} from '@/lib/api-error-handler'
import { k8sClient } from '@/lib/k8s-client'
import { serviceResolver } from '@/lib/service-resolver'

// POST /api/personas/generate - Generate a persona using a cluster model
const NAMESPACE = process.env.OPERATOR_NAMESPACE || 'language-operator'


export async function POST(request: NextRequest) {
  try {
    const { email } = await getAuthenticatedUser(request)


    // Check permissions

    const body = await request.json()
    const { idea, modelName } = body

    if (!idea) {
      return createErrorResponse(
        new Error('Idea is required'),
        'Invalid request data'
      )
    }

    if (!modelName) {
      return createErrorResponse(
        new Error('Model name is required'),
        'Invalid request data'
      )
    }

    // Generate persona using the cluster model via LiteLLM proxy
    // The model is exposed as a k8s service at: http://{modelName}.{namespace}.svc.cluster.local
    const systemPrompt = `You are an expert AI persona designer. Your task is to create well-structured personas for AI agents based on user ideas.

When given an idea, you must respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "kebab-case-name",
  "tone": "A short description of communication style, e.g. professional, concise and direct",
  "personality": "Character and behavioural traits — what makes this persona distinctive",
  "expertise": "Domain knowledge and skills — what this persona knows and is good at"
}

Guidelines:
- name must be lowercase alphanumeric with hyphens only (e.g. "senior-go-engineer")
- tone is a short free-form string (e.g. "professional", "friendly and encouraging")
- personality describes how the persona behaves and communicates
- expertise describes the domain knowledge and technical skills
- Make all fields specific and immediately useful`

    const userPrompt = `Create a persona for: ${idea}`

    console.log(`Generating persona with model ${modelName} for idea: "${idea}"`)

    // Fetch the LanguageModel resource to get the actual model name and cluster ref
    let actualModelName: string = ''
    let clusterRef: string | undefined
    let modelStatus: string | undefined
    try {
      const modelResource = await k8sClient.getLanguageModel(NAMESPACE, modelName)
      const modelBody = (modelResource as { body?: { spec?: { modelName?: string; clusterRef?: string }; status?: { phase?: string } } })?.body ?? modelResource as { spec?: { modelName?: string; clusterRef?: string }; status?: { phase?: string } }
      actualModelName = modelBody.spec?.modelName ?? ''
      clusterRef = modelBody.spec?.clusterRef
      modelStatus = modelBody.status?.phase

      if (!actualModelName) {
        throw new ModelNotAvailableError(modelName, NAMESPACE, 'missing_spec')
      }

      if (!clusterRef) {
        throw new ModelNotAvailableError(modelName, NAMESPACE, 'missing_cluster_ref')
      }

      // Check if model is ready - 'Managed' means it is registered with the cluster proxy
      if (modelStatus && modelStatus !== 'Ready' && modelStatus !== 'Managed') {
        throw new ModelNotAvailableError(modelName, NAMESPACE, modelStatus)
      }

      console.log(`Resolved model name: ${modelName} -> ${actualModelName} (status: ${modelStatus})`)
    } catch (error: unknown) {
      console.error('Failed to fetch LanguageModel:', error)

      // Check if it's a 404 error (model not found)
      const asRecord = error as Record<string, unknown>
      if ((asRecord?.response as Record<string, unknown>)?.statusCode === 404 || asRecord?.statusCode === 404) {
        throw new ModelNotAvailableError(modelName, NAMESPACE, 'not_found')
      }

      // Re-throw our custom errors
      if (error instanceof ModelNotAvailableError) {
        throw error
      }

      // For other errors, wrap in a generic model availability error
      throw new ModelNotAvailableError(modelName, NAMESPACE, 'fetch_failed')
    }

    // Resolve endpoint: shared cluster proxy (one proxy per cluster)
    const modelEndpoint = serviceResolver.resolveClusterProxyUrl(clusterRef!)

    console.log(`Resolved cluster proxy endpoint: ${modelEndpoint}`)

    // Set a timeout for the generation request
    const timeoutSeconds = 60
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000)

    let response: Response
    try {
      response = await fetch(modelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: actualModelName, // LiteLLM expects the actual model name from spec.modelName
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
        signal: controller.signal
      })
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      console.error('Model endpoint error:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GenerationTimeoutError(modelName, timeoutSeconds)
      }

      // Map different network errors to specific error types
      const errorMessage = error instanceof Error ? error.message : ''
      throw new ModelEndpointError(modelName, modelEndpoint, errorMessage)
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Model API error:', response.status, errorData)
      throw new ModelResponseError(modelName, response.status, errorData)
    }

    let data: { choices?: Array<{ message?: { content?: string } }> }
    try {
      data = await response.json()
    } catch (error) {
      console.error('Failed to parse model response as JSON:', error)
      const responseText = await response.text()
      throw new ModelResponseError(modelName, response.status, `Invalid JSON response: ${responseText.slice(0, 200)}`)
    }

    const generatedText = data.choices?.[0]?.message?.content
    if (!generatedText) {
      console.error('No generated text in model response:', data)
      throw new ModelResponseError(modelName, response.status, 'Model response missing generated text')
    }

    console.log('Generated text:', generatedText)

    // Parse the generated JSON
    let personaData
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      const jsonText = jsonMatch ? jsonMatch[1] : generatedText
      personaData = JSON.parse(jsonText.trim())
      
      // Validate that at least one meaningful field is present
      if (!personaData.name && !personaData.tone && !personaData.personality && !personaData.expertise) {
        throw new GenerationParsingError(generatedText)
      }
    } catch (parseError) {
      console.error('Failed to parse generated JSON:', parseError, generatedText)
      if (parseError instanceof GenerationParsingError) {
        throw parseError
      }
      throw new GenerationParsingError(generatedText)
    }

    console.log('Parsed persona data:', personaData)

    return NextResponse.json({
      success: true,
      data: personaData,
    })

  } catch (error: unknown) {
    console.error('Error generating persona:', error)

    // Our custom errors already have detailed messages, pass them through
    if (error instanceof ModelNotAvailableError ||
        error instanceof ModelEndpointError ||
        error instanceof ModelResponseError ||
        error instanceof GenerationParsingError ||
        error instanceof GenerationTimeoutError) {
      return createErrorResponse(error)
    }

    // For unexpected errors, provide a generic fallback
    return createErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to generate persona due to an unexpected error'
    )
  }
}
