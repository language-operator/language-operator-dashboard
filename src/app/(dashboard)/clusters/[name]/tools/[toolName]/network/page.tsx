'use client'

import { useParams } from 'next/navigation'
import { useTool } from '@/hooks/use-tools'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe } from 'lucide-react'
import { LanguageTool } from '@/types/tool'

interface ToolNetworkProps {
  tool: LanguageTool
}

function ToolNetwork({ tool }: ToolNetworkProps) {
  return (
    <div className="space-y-6">
      {/* Network Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Policy
          </CardTitle>
          <CardDescription>
            External network access rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tool.spec.egress && tool.spec.egress.length > 0 ? (
            <div className="space-y-3">
              {tool.spec.egress.map((rule, index) => (
                <div key={index} className="border border-stone-200 p-3 dark:border-stone-700">
                  <div className="space-y-2">
                    {rule.description && (
                      <div>
                        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Description</p>
                        <p className="text-sm">{rule.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {rule.to?.dns && rule.to.dns.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">DNS Names</p>
                          <p className="text-sm font-mono">{rule.to.dns.join(', ')}</p>
                        </div>
                      )}
                      {rule.ports && rule.ports.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Ports</p>
                          <p className="text-sm font-mono">{rule.ports.map(p => p.port).join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Globe className="h-8 w-8 text-stone-500 dark:text-stone-400 mx-auto mb-2" />
              <p className="text-sm text-stone-600 dark:text-stone-400">No network egress rules configured</p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">
                Network policies control external access from the tool
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ToolNetworkPage() {
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading network configuration...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tool) {
    return null // Layout handles error state
  }

  return <ToolNetwork tool={tool} />
}
