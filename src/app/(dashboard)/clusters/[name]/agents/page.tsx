'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterBar } from '@/components/ui/filter-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ResourceHeader } from '@/components/ui/resource-header'
import { EventsActivity } from '@/components/ui/events-activity'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bot, Plus, MoreHorizontal, Eye, Edit, Trash2, Search } from 'lucide-react'
import { AnimatedStatus } from '@/components/ui/animated-status'
import Link from 'next/link'
import { LanguageAgent } from '@/types/agent'
import { useAgents, useDeleteAgent } from '@/hooks/use-agents'
import { useWatchAgents } from '@/hooks/use-watch'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/format'

export default function ClusterAgents() {
  const params = useParams()
  const router = useRouter()
  const clusterName = params?.name as string

  const [search, setSearch] = useState('')
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null)

  // Use the agents hook for real-time updates
  const { data: agentsData, isLoading: loading, error: agentsError } = useAgents({
    clusterName,
    page: 1,
    limit: 1000, // Get all agents for list view
  })

  // Enable real-time updates via SSE watch
  useWatchAgents({ clusterName })

  const deleteAgent = useDeleteAgent(clusterName)

  const handleConfirmDelete = () => {
    if (!deletingAgent) return
    const name = deletingAgent
    deleteAgent.mutateAsync(name)
      .then(() => setDeletingAgent(null))
      .catch(() => toast.error('Failed to delete agent. Please try again.'))
  }

  const agents: LanguageAgent[] = agentsData?.data || []
  const error = agentsError ? (agentsError as Error).message : null

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const searchQuery = search.toLowerCase()
      return !search ||
        agent.metadata.name!.toLowerCase().includes(searchQuery) ||
        (agent.spec.instructions || '').toLowerCase().includes(searchQuery)
    })
  }, [agents, search])

  const clusterAgents = filteredAgents

  return (
    <div className="space-y-6">
        {/* Header */}
        <ResourceHeader
          icon={Bot}
          title="Agents"
          subtitle="Natural language-based goals and automations"
          actions={
            <Button asChild>
              <Link href={`/clusters/${clusterName}/agents/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Agent
              </Link>
            </Button>
          }
        />

        {/* Filters */}
        <FilterBar>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </FilterBar>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Bot className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading agents...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Bot className="h-8 w-8 mx-auto mb-4 text-red-400" />
                <p className="text-red-600 mb-2">Failed to load agents</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agents List */}
        {!loading && !error && (
          <>
            {clusterAgents.length === 0 ? (
              /* Empty State */
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <CardTitle className="text-xl mb-2">No agents yet</CardTitle>
                  <CardDescription className="text-center max-w-md mb-6">
                    Agents combine models, personas, and tools to create intelligent 
                    assistants. Deploy your first agent to get started.
                  </CardDescription>
                  <Button asChild>
                    <Link href={`/clusters/${clusterName}/agents/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Agent
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Agents Table */
              <Card>
                <CardHeader>
                  <CardTitle>Agents ({clusterAgents.length})</CardTitle>
                  <CardDescription>Language agents in this cluster</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Models</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clusterAgents.map((agent) => (
                        <TableRow key={agent.metadata.name}>
                          <TableCell className="font-light">
                            <Link
                              href={`/clusters/${clusterName}/agents/${agent.metadata.name}`}
                              className="hover:underline"
                            >
                              {agent.metadata.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(agent.spec.models || []).slice(0, 2).map((modelRef) => (
                                <Badge key={modelRef.name} variant="outline" className="text-xs">
                                  {modelRef.name}
                                </Badge>
                              ))}
                              {(agent.spec.models?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(agent.spec.models!.length - 2)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <AnimatedStatus status={agent.status?.phase || 'Unknown'} size="sm" />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(agent.metadata.creationTimestamp)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/clusters/${clusterName}/agents/${agent.metadata.name}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/clusters/${clusterName}/agents/${agent.metadata.name}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeletingAgent(agent.metadata.name!)}
                                  disabled={deleteAgent.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            
            {/* Agent Events - Show events related to agents in this cluster */}
            {!loading && !error && clusterAgents.length > 0 && (
              <EventsActivity
                title="Agent Events"
                description="Real-time events for agents in this cluster"
                clusterName={clusterName}
                resourceType="agent"
                limit={6}
                showNamespace={false}
              />
            )}
          </>
        )}
        <DeleteResourceDialog
          open={!!deletingAgent}
          onOpenChange={(open) => !open && setDeletingAgent(null)}
          resourceType="agent"
          resourceName={deletingAgent ?? undefined}
          isLoading={deleteAgent.isPending}
          onConfirm={handleConfirmDelete}
        />
    </div>
  )
}