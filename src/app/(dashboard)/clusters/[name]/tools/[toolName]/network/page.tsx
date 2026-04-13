'use client'

import { useParams } from 'next/navigation'
import { useTool } from '@/hooks/use-tools'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe } from 'lucide-react'
import { NetworkEgressRule, NetworkPort } from '@/types/shared'
import { Spinner } from '@/components/ui/spinner'

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
              <Spinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading network configuration...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tool) {
    return null
  }

  const hasNetworkPolicies = tool.spec.networkPolicies &&
    ((tool.spec.networkPolicies.egress && tool.spec.networkPolicies.egress.length > 0) ||
     (tool.spec.networkPolicies.ingress && tool.spec.networkPolicies.ingress.length > 0))

  return (
    <div className="space-y-6">
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
          {hasNetworkPolicies ? (
            <div className="space-y-3">
              {(tool.spec.networkPolicies?.egress || []).map((rule: NetworkEgressRule, index: number) => (
                <div key={index} className="border border-stone-200 p-3 dark:border-stone-700">
                  <div className="space-y-2">
                    <div className="text-sm font-light text-stone-600 dark:text-stone-400">Egress Rule {index + 1}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {rule.to && rule.to.length > 0 && rule.to.flatMap(peer => peer.dns || []).length > 0 && (
                        <div>
                          <p className="text-sm font-light text-stone-600 dark:text-stone-400">DNS Names</p>
                          <p className="text-sm font-mono">{rule.to.flatMap(peer => peer.dns || []).join(', ')}</p>
                        </div>
                      )}
                      {rule.ports && rule.ports.length > 0 && (
                        <div>
                          <p className="text-sm font-light text-stone-600 dark:text-stone-400">Ports</p>
                          <p className="text-sm font-mono">{rule.ports.map((p: NetworkPort) => p.port).join(', ')}</p>
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
              <p className="text-sm text-stone-600 dark:text-stone-400">No network policies configured</p>
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
