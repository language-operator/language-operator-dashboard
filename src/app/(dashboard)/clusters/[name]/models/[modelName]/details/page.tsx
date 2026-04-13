'use client'

import { useParams } from 'next/navigation'
import { useModel } from '@/hooks/use-models'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import { LanguageModel } from '@/types/model'
import { Spinner } from '@/components/ui/spinner'

interface ModelDetailsProps {
  model: LanguageModel
}

function ModelDetails({ model }: ModelDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rate Limiting
          </CardTitle>
          <CardDescription>
            Request rate limits and throttling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {model.spec.rateLimits ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {model.spec.rateLimits.requestsPerMinute && (
                <div>
                  <p className="text-sm font-light text-stone-600 dark:text-stone-400">Requests per Minute</p>
                  <p className="text-sm">{model.spec.rateLimits.requestsPerMinute.toLocaleString()}</p>
                </div>
              )}
              {model.spec.rateLimits.tokensPerMinute && (
                <div>
                  <p className="text-sm font-light text-stone-600 dark:text-stone-400">Tokens per Minute</p>
                  <p className="text-sm">{model.spec.rateLimits.tokensPerMinute.toLocaleString()}</p>
                </div>
              )}
              {!model.spec.rateLimits.requestsPerMinute && !model.spec.rateLimits.tokensPerMinute && (
                <p className="text-sm text-muted-foreground italic">No limits configured</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No rate limits configured</p>
          )}
        </CardContent>
      </Card>

      {/* Timeout */}
      {model.spec.timeout && (
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-light text-stone-600 dark:text-stone-400">Request Timeout</p>
              <p className="text-sm">{model.spec.timeout}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ModelDetailsPage() {
  const params = useParams()
  const clusterName = params.name as string
  const modelName = params.modelName as string

  const { data: modelResponse, isLoading } = useModel(modelName, clusterName)
  const model = modelResponse?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-muted-foreground">Loading model details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!model) {
    return null
  }

  return <ModelDetails model={model} />
}
