'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Download,
  Server,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ToolCatalogEntry, getToolDisplayName } from '@/types/tool-catalog'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Wrench } from 'lucide-react'

export default function InstallToolPage() {
  const params = useParams()
  const router = useRouter()
  const clusterName = params?.name as string
  const toolName = params?.toolName as string
  
  const [tool, setTool] = useState<ToolCatalogEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchToolDetails()
  }, [toolName])

  const fetchToolDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/tools/catalog')
      if (!response.ok) {
        throw new Error('Failed to fetch tool catalog')
      }

      const catalog = await response.json()
      const toolData = catalog.tools[toolName]
      
      if (!toolData) {
        throw new Error(`Tool "${toolName}" not found in catalog`)
      }

      setTool(toolData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool details')
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async () => {
    if (!tool) return

    try {
      setInstalling(true)
      setError(null)

      const response = await fetch('/api/tools/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: toolName,
          clusterName: clusterName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to install tool')
      }

      setSuccess(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/clusters/${clusterName}/tools`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install tool')
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-100 mx-auto"></div>
          <p className="mt-4 text-stone-600 dark:text-stone-400">Loading tool details...</p>
        </div>
      </div>
    )
  }

  if (error && !tool) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <CardTitle className="text-xl mb-2">Error Loading Tool</CardTitle>
            <CardDescription className="text-center max-w-md mb-4">
              {error}
            </CardDescription>
            <Button asChild variant="outline">
              <Link href={`/clusters/${clusterName}/tools`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tools
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tool) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResourceHeader
        backHref={`/clusters/${clusterName}/tools`}
        backLabel="Back to Tools"
        icon={Wrench}
        title={`Install ${getToolDisplayName(tool)}`}
        subtitle={`Review tool details before installing to ${clusterName} cluster`}
      />

      {/* Success Message */}
      {success && (
        <Alert className="bg-status-ready border-status-ready/30">
          <CheckCircle className="h-4 w-4 text-status-ready-foreground" />
          <AlertDescription className="text-status-ready-foreground">
            Tool installed successfully! Redirecting to tools list...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tool Details */}
      <Card>
        <CardHeader>
          <CardTitle>{getToolDisplayName(tool)}</CardTitle>
          <CardDescription>{tool.metadata.annotations?.['langop.io/description'] || ''}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-light mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone-600 dark:text-stone-400">Tool ID:</span>
                <span className="ml-2 font-mono">{toolName}</span>
              </div>
              {tool.spec?.type && (
                <div>
                  <span className="text-stone-600 dark:text-stone-400">Type:</span>
                  <Badge variant="secondary" className="ml-2">
                    {tool.spec.type.toUpperCase()}
                  </Badge>
                </div>
              )}
              {tool.spec?.port && (
                <div>
                  <span className="text-stone-600 dark:text-stone-400">Port:</span>
                  <span className="ml-2">{tool.spec.port}</span>
                </div>
              )}
            </div>
          </div>

          {/* Container */}
          {tool.spec?.image && (
            <div>
              <h3 className="font-light mb-3">Container</h3>
              <div className="flex items-center gap-2 p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md">
                <Server className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                <code className="text-sm flex-1 font-mono">{tool.spec.image}</code>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push(`/clusters/${clusterName}/tools`)}
              disabled={installing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleInstall} 
              disabled={installing || success}
            >
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install Tool
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}