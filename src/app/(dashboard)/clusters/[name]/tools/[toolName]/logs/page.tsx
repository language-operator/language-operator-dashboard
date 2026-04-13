'use client'

import { useParams } from 'next/navigation'
import { useTool } from '@/hooks/use-tools'
import { ToolLogs } from '@/components/tools/tool-logs'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function ToolLogsPage() {
  const params = useParams()
  const clusterName = params.name as string
  const toolName = params.toolName as string

  const { data: toolResponse, isLoading } = useTool(toolName, clusterName)
  const tool = toolResponse?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading logs...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tool) {
    return null // Layout handles error state
  }

  return <ToolLogs tool={tool} clusterName={clusterName} />
}