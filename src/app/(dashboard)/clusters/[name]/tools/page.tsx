'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ToolStatusBadge } from '@/components/ui/resource-status-badge'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Wrench, Download, CheckCircle, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { ToolCatalog, ToolCatalogEntry, InstalledTool, getToolDisplayName, getToolTags } from '@/types/tool-catalog'
import { LanguageTool } from '@/types/tool'
import { EventsActivity } from '@/components/ui/events-activity'
import { useTools } from '@/hooks/use-tools'
import { useWatchTools } from '@/hooks/use-watch'
import { Spinner } from '@/components/ui/spinner'

export default function ClusterTools() {
  const params = useParams()
  const clusterName = params?.name as string
  const [catalog, setCatalog] = useState<ToolCatalog | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Use the tools hook for installed tools (with real-time updates)
  const { data: toolsData, isLoading: toolsLoading, error: toolsError } = useTools({
    clusterName,
    page: 1,
    limit: 1000, // Get all tools for catalog view
  })

  // Enable real-time updates via SSE watch
  useWatchTools()

  // Convert LanguageTool objects to InstalledTool format
  const installedTools = useMemo(() => {
    return ((toolsData?.data || []) as LanguageTool[]).map((tool) => ({
      name: tool.metadata.name!,
      catalogName: tool.metadata.labels?.['langop.io/catalog-name'] || tool.metadata.name!,
      status: {
        phase: tool.status?.phase || 'Unknown',
        message: tool.status?.conditions?.[0]?.message || ''
      }
    }))
  }, [toolsData])

  // Fetch catalog separately (static data, doesn't need watch)
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setCatalogLoading(true)
        setCatalogError(null)

        const catalogResponse = await fetch('/api/tools/catalog')
        if (!catalogResponse.ok) {
          throw new Error('Failed to fetch tool catalog')
        }
        const catalogData = await catalogResponse.json()
        setCatalog(catalogData)
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Failed to load tool catalog')
      } finally {
        setCatalogLoading(false)
      }
    }

    fetchCatalog()
  }, [])

  const isToolInstalled = (toolName: string) => {
    return installedTools.some((tool: InstalledTool) =>
      tool.catalogName === toolName ||
      tool.name === toolName
    )
  }

  const getCatalogEntryForInstalledTool = (installedTool: InstalledTool) => {
    if (!catalog?.tools) return null
    const toolName = installedTool.catalogName || installedTool.name
    return Object.entries(catalog.tools).find(([id, _]) => id === toolName)?.[1] || null
  }

  const ToolCard = ({ 
    toolId, 
    tool, 
    isInstalled, 
    installedTool, 
    clusterName 
  }: {
    toolId: string
    tool: ToolCatalogEntry
    isInstalled: boolean
    installedTool?: InstalledTool
    clusterName: string
  }) => {
    const router = useRouter()

    const handleCardClick = (event: React.MouseEvent) => {
      // Only make installed tools clickable
      if (!isInstalled || !installedTool) return
      
      // Don't navigate if clicking on buttons or other interactive elements
      const target = event.target as HTMLElement
      if (target.closest('button') || target.closest('a')) {
        return
      }
      
      router.push(`/clusters/${clusterName}/tools/${installedTool.name}`)
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!isInstalled || !installedTool) return
      
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        router.push(`/clusters/${clusterName}/tools/${installedTool.name}`)
      }
    }

    return (
      <Card 
        className={`flex flex-col h-full ${
          isInstalled && installedTool
            ? 'cursor-pointer hover:shadow-md hover:border-border transition-all'
            : ''
        }`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInstalled && installedTool ? 0 : -1}
        role={isInstalled && installedTool ? 'button' : undefined}
        aria-label={isInstalled && installedTool ? `View details for ${getToolDisplayName(tool)}` : undefined}
      >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{getToolDisplayName(tool)}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {tool.metadata.annotations?.['langop.io/description'] || ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-3 flex-1">
          {/* Tool metadata */}
          <div className="flex flex-wrap gap-2">
            {tool.spec?.type && (
              <Badge variant="outline" className="text-xs">
                {tool.spec.type}
              </Badge>
            )}
            {tool.spec?.deploymentMode && (
              <Badge variant="outline" className="text-xs">
                {tool.spec.deploymentMode}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions/Status - anchored to bottom */}
        <div className="flex gap-2 pt-3 mt-auto">
            {isInstalled && installedTool ? (
              <>
                <div className="flex-1 flex items-center gap-2">
                  <ToolStatusBadge tool={installedTool} />
                  {installedTool.status.message && (
                    <span className="text-xs text-muted-foreground truncate">
                      {installedTool.status.message.replace('Image registry is in whitelist', 'approved registry')}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                {isInstalled ? (
                  <Button disabled className="flex-1 bg-status-ready text-status-ready-foreground hover:bg-status-ready" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Installed
                  </Button>
                ) : (
                  <Button asChild className="flex-1" size="sm">
                    <Link href={`/clusters/${clusterName}/tools/install/${toolId}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </Link>
                  </Button>
                )}
                {tool.metadata.annotations?.['langop.io/homepage'] && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={tool.metadata.annotations['langop.io/homepage']} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </>
            )}
        </div>
      </CardContent>
    </Card>
    )
  }

  const filteredTools = catalog?.tools
    ? Object.entries(catalog.tools).filter(([_, tool]) => {
        const query = searchQuery.toLowerCase()
        const displayName = getToolDisplayName(tool)
        const description = tool.metadata.annotations?.['langop.io/description'] || ''
        return (
          (tool.metadata.name || '').toLowerCase().includes(query) ||
          displayName.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query)
        )
      })
    : []

  // Filter installed tools by search query as well
  const filteredInstalledTools = installedTools.filter((installedTool: InstalledTool) => {
    const catalogEntry = getCatalogEntryForInstalledTool(installedTool)
    if (!catalogEntry) return false
    const query = searchQuery.toLowerCase()
    const displayName = getToolDisplayName(catalogEntry)
    const description = catalogEntry.metadata.annotations?.['langop.io/description'] || ''
    return (
      (catalogEntry.metadata.name || '').toLowerCase().includes(query) ||
      displayName.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      installedTool.name.toLowerCase().includes(query)
    )
  })

  const isLoading = catalogLoading || toolsLoading
  const error = catalogError || (toolsError ? (toolsError as Error).message : null)

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Spinner className="mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading tools...</p>
          </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-light">Tools</h1>
            <p className="text-muted-foreground mt-1">
              Official tools for the {clusterName} cluster
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Wrench className="h-16 w-16 text-red-500 mb-4" />
              <CardTitle className="text-xl mb-2">Error Loading Tools</CardTitle>
              <CardDescription className="text-center max-w-md">
                {error}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <ResourceHeader
          icon={Wrench}
          title="Tools"
          subtitle="Agents use MCP-compatible tools to perform work"
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Installed Tools Section */}
        {filteredInstalledTools.length > 0 && (
          <div>
            <h2 className="text-xl font-light mb-4">Installed Tools ({filteredInstalledTools.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInstalledTools.map((installedTool: InstalledTool) => {
                const catalogEntry = getCatalogEntryForInstalledTool(installedTool)
                if (!catalogEntry) return null
                const toolId = installedTool.catalogName || installedTool.name
                return (
                  <ToolCard
                    key={installedTool.name}
                    toolId={toolId}
                    tool={catalogEntry}
                    isInstalled={true}
                    installedTool={installedTool}
                    clusterName={clusterName}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Available Tools Section */}
        <div>
          <h2 className="text-xl font-light mb-4">Available Tools</h2>
          {filteredTools.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Wrench}
                  title="No tools found"
                  description={searchQuery
                    ? `No tools match your search "${searchQuery}"`
                    : 'No tools available in the catalog'}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map(([toolId, tool]) => {
                const installed = isToolInstalled(toolId)
                return (
                  <ToolCard
                    key={toolId}
                    toolId={toolId}
                    tool={tool}
                    isInstalled={installed}
                    clusterName={clusterName}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Tool Events */}
        <EventsActivity
          title="Tool Events"
          description="Recent events for tools in this cluster"
          clusterName={clusterName}
          resourceType="tool"
          limit={10}
          showNamespace={false}
        />
      </div>
  )
}