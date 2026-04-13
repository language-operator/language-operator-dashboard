'use client'

import { useParams } from 'next/navigation'
import { useModel } from '@/hooks/use-models'
import { ModelLogs } from '@/components/models/model-logs'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function ModelLogsPage() {
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
              <p className="text-muted-foreground">Loading logs...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!model) {
    return null // Layout handles error state
  }

  return <ModelLogs model={model} clusterName={clusterName} />
}