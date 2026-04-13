'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResourceHeader } from '@/components/ui/resource-header'
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
import { Cpu, Plus, ExternalLink, MoreHorizontal, Eye, Edit, Trash2, Search } from 'lucide-react'
import { AnimatedStatus } from '@/components/ui/animated-status'
import Link from 'next/link'
import { useModels, useDeleteModel } from '@/hooks/use-models'
import { useWatchModels } from '@/hooks/use-watch'
import { EventsActivity } from '@/components/ui/events-activity'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { LanguageModel } from '@/types/model'
import { formatTimeAgo } from '@/lib/format'

export default function ClusterModels() {
  const params = useParams()
  const clusterName = params?.name as string
  const [search, setSearch] = React.useState('')
  const [providerFilter, setProviderFilter] = React.useState<string>('all')
  const [deletingModel, setDeletingModel] = React.useState<string | null>(null)

  // Use cluster-specific API endpoint with real-time updates
  const { data: modelsResponse, isLoading, error } = useModels({
    clusterName,
    limit: 100
  })

  // Enable real-time updates via SSE watch
  useWatchModels()

  const deleteModel = useDeleteModel(clusterName)

  const handleConfirmDelete = () => {
    if (!deletingModel) return
    const name = deletingModel
    deleteModel.mutateAsync(name)
      .then(() => setDeletingModel(null))
      .catch(() => toast.error('Failed to delete model. Please try again.'))
  }

  const allModels: LanguageModel[] = modelsResponse?.data || []
  
  
  
  // Filter models based on search and provider
  const filteredModels = allModels.filter((model) => {
    const searchQuery = search.toLowerCase()
    const matchesSearch = !search || 
      model.metadata.name!.toLowerCase().includes(searchQuery) ||
      (model.spec.provider || '').toLowerCase().includes(searchQuery) ||
      (model.spec.modelName || '').toLowerCase().includes(searchQuery)
    
    const matchesProvider = providerFilter === 'all' || 
      (model.spec.provider || '').toLowerCase() === providerFilter.toLowerCase()
    
    return matchesSearch && matchesProvider
  })
  
  // For now, show filtered models (TODO: implement proper cluster-scoped filtering)
  const clusterModels = filteredModels
  
  // Get unique providers for filter dropdown
  const providers = React.useMemo(() => {
    const uniqueProviders = Array.from(new Set(
      allModels.map((model) => model.spec.provider).filter(Boolean)
    )) as string[]
    return uniqueProviders.sort()
  }, [allModels])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading models...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <ResourceHeader
          icon={Cpu}
          title="Models"
          subtitle="Large language models used for reasoning"
          actions={
            <Button asChild>
              <Link href={`/clusters/${clusterName}/models/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Model
              </Link>
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search models..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Models List or Empty State */}
        {clusterModels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Cpu className="h-16 w-16 text-muted-foreground mb-4" />
              <CardTitle className="text-xl mb-2">No models yet</CardTitle>
              <CardDescription className="text-center max-w-md mb-6">
                Language models define the AI capabilities available in this cluster. 
                Add your first model to get started.
              </CardDescription>
              <Button asChild>
                <Link href={`/clusters/${clusterName}/models/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Model
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Models ({clusterModels.length})</CardTitle>
              <CardDescription>Language models in this cluster</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clusterModels.map((model) => (
                    <TableRow key={model.metadata.name}>
                      <TableCell className="font-light">
                        <Link 
                          href={`/clusters/${clusterName}/models/${model.metadata.name}`}
                          className="hover:underline"
                        >
                          {model.metadata.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{model.spec.provider}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{model.spec.modelName}</span>
                      </TableCell>
                      <TableCell>
                        <AnimatedStatus status={model.status?.phase || 'Unknown'} size="sm" />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(model.metadata.creationTimestamp)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/clusters/${clusterName}/models/${model.metadata.name}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/clusters/${clusterName}/models/${model.metadata.name}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingModel(model.metadata.name!)}
                              disabled={deleteModel.isPending}
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

        {/* Model Events */}
        <EventsActivity
          title="Model Events"
          description="Recent events for models in this cluster"
          clusterName={clusterName}
          resourceType="model"
          limit={10}
          showNamespace={false}
        />
        <DeleteResourceDialog
          open={!!deletingModel}
          onOpenChange={(open) => !open && setDeletingModel(null)}
          resourceType="model"
          resourceName={deletingModel ?? undefined}
          isLoading={deleteModel.isPending}
          onConfirm={handleConfirmDelete}
        />
    </div>
  )
}