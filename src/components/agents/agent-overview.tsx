'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { useModels } from '@/hooks/use-models'
import { useTools } from '@/hooks/use-tools'
import { usePersonas } from '@/hooks/use-personas'
import { ResourceEventsActivity } from '@/components/ui/events-activity'
import { LanguageAgent } from '@/types/agent'
import type { LanguageModel } from '@/types/model'
import type { LanguageTool } from '@/types/tool'
import type { LanguagePersona } from '@/types/persona'
import { formatTimeAgo } from './utils'

interface AgentOverviewProps {
  agent: LanguageAgent
  clusterName: string
}

export function AgentOverview({ agent, clusterName }: AgentOverviewProps) {
  const { theme } = useTheme()
  const { data: modelsResponse } = useModels({ clusterName })
  const { data: toolsResponse } = useTools({ clusterName })
  const { data: personasResponse } = usePersonas({ clusterName })

  const allModels: LanguageModel[] = modelsResponse?.data || []
  const allTools: LanguageTool[] = toolsResponse?.data || []
  const allPersonas: LanguagePersona[] = personasResponse?.data || []

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-light text-stone-600 dark:text-stone-400">Name</p>
              <p className="text-sm">{agent.metadata.name}</p>
            </div>
            {agent.spec.runtime && (
              <div>
                <p className="text-sm font-light text-stone-600 dark:text-stone-400">Runtime</p>
                <Badge variant="secondary">{agent.spec.runtime}</Badge>
              </div>
            )}
            <div>
              <p className="text-sm font-light text-stone-600 dark:text-stone-400">Created</p>
              <p className="text-sm">{formatTimeAgo(agent.metadata.creationTimestamp)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal / Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-stone-200 dark:border-stone-700 overflow-hidden">
            {agent.spec.instructions ? (
              <SyntaxHighlighter
                language="markdown"
                style={theme === 'dark' ? oneDark : oneLight}
                wrapLines={true}
                wrapLongLines={true}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                  }
                }}
              >
                {agent.spec.instructions}
              </SyntaxHighlighter>
            ) : (
              <div className="p-4 text-base leading-relaxed text-stone-600 dark:text-stone-400">
                No goal specified
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Models, Tools, and Persona */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Models</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.spec.models && agent.spec.models.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agent.spec.models.map((modelRef, index) => {
                  const found = allModels.find((m) => m.metadata?.name === modelRef.name)
                  return (
                    <div key={index}>
                      {found ? (
                        <Link href={`/clusters/${clusterName}/models/${modelRef.name}`}>
                          <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">
                            {modelRef.name}
                            {modelRef.role && modelRef.role !== 'primary' && (
                              <span className="ml-1 text-xs text-muted-foreground">({modelRef.role})</span>
                            )}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="destructive">{modelRef.name}</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">None</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.spec.tools && agent.spec.tools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agent.spec.tools.map((toolRef, index) => {
                  const found = allTools.find((t) => t.metadata?.name === toolRef.name)
                  return (
                    <div key={index}>
                      {found ? (
                        <Link href={`/clusters/${clusterName}/tools/${toolRef.name}`}>
                          <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">
                            {toolRef.name}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="destructive">{toolRef.name}</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">None</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona</CardTitle>
          </CardHeader>
          <CardContent>
            {agent.spec.persona ? (
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const found = allPersonas.find((p) => p.metadata?.name === agent.spec.persona)
                  return found ? (
                    <Link href={`/clusters/${clusterName}/personas/${agent.spec.persona}`}>
                      <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">
                        {agent.spec.persona}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="destructive">{agent.spec.persona}</Badge>
                  )
                })()}
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">None</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Status &amp; Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {agent.status?.conditions && agent.status.conditions.length > 0 ? (
            <div className="space-y-3">
              {agent.status.conditions.map((condition, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-stone-200 dark:border-stone-700">
                  <div>
                    <p className="text-sm font-light">{condition.type}</p>
                    {condition.message && (
                      <p className="text-xs text-stone-600 dark:text-stone-400">{condition.message}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {condition.status === 'True' ? (
                      <CheckCircle className="h-4 w-4 text-status-ready-foreground" />
                    ) : condition.status === 'False' ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-status-pending-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600 dark:text-stone-400">No status conditions available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <ResourceEventsActivity
        resourceType="agent"
        resourceName={agent.metadata.name || ''}
        namespace={agent.metadata.namespace || ''}
        limit={10}
      />
    </div>
  )
}
