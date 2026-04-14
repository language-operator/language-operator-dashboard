'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterBar } from '@/components/ui/filter-bar'
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
import { Users, Plus, MessageCircle, Palette, Clock, MoreHorizontal, Eye, Edit, Trash2, Search } from 'lucide-react'
import { AnimatedStatus } from '@/components/ui/animated-status'
import Link from 'next/link'
import { usePersonas, useDeletePersona } from '@/hooks/use-personas'
import { useWatchPersonas } from '@/hooks/use-watch'
import { EventsActivity } from '@/components/ui/events-activity'
import { useRouter } from 'next/navigation'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { LanguagePersona } from '@/types/persona'
import { formatTimeAgo } from '@/lib/format'

export default function ClusterPersonas() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const [search, setSearch] = React.useState('')
  const [toneFilter, setToneFilter] = React.useState<string>('all')
  const [deletingPersona, setDeletingPersona] = React.useState<string | null>(null)

  // Fetch all personas with real-time updates
  const { data: personasResponse, isLoading, error } = usePersonas({ clusterName, limit: 100 })
  const deletePersona = useDeletePersona(clusterName)

  // Enable real-time updates via SSE watch
  useWatchPersonas()

  const allPersonas: LanguagePersona[] = personasResponse?.data || []
  
  // Filter personas based on search and tone
  const filteredPersonas = allPersonas.filter((persona: LanguagePersona) => {
    const searchQuery = search.toLowerCase()
    const matchesSearch = !search ||
      persona.metadata.name!.toLowerCase().includes(searchQuery)

    const matchesTone = toneFilter === 'all' ||
      (persona.spec.tone || '').toLowerCase() === toneFilter.toLowerCase()

    return matchesSearch && matchesTone
  })
  
  // For now, show filtered personas (TODO: implement proper cluster-scoped filtering)
  const clusterPersonas = filteredPersonas
  
  // Get unique tones for filter dropdown
  const tones = React.useMemo(() => {
    const uniqueTones = Array.from(new Set(
      allPersonas.map((persona: LanguagePersona) => persona.spec.tone).filter(Boolean)
    )) as string[]
    return uniqueTones.sort()
  }, [allPersonas])

  const handleConfirmDelete = () => {
    if (!deletingPersona) return
    const name = deletingPersona
    deletePersona.mutateAsync(name)
      .then(() => setDeletingPersona(null))
      .catch(() => toast.error('Failed to delete persona. Please try again.'))
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <ResourceHeader
          icon={Users}
          title="Personas"
          subtitle="Personalities and preferences agents can use to influence their behavior"
          actions={
            <Button asChild>
              <Link href={`/clusters/${clusterName}/personas/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Persona
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
                placeholder="Search personas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={toneFilter} onValueChange={setToneFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Tones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tones</SelectItem>
              {tones.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading personas...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-4 text-red-400" />
                <p className="text-red-600 mb-2">Failed to load personas</p>
                <p className="text-muted-foreground text-sm">{error.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personas List */}
        {!isLoading && !error && (
          <>
            {clusterPersonas.length === 0 ? (
              /* Empty State */
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Users}
                    title="No personas yet"
                    description="Personas define the behavior, knowledge, and communication style for AI agents. Create your first persona to get started."
                    action={
                      <Button asChild>
                        <Link href={`/clusters/${clusterName}/personas/new`}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Persona
                        </Link>
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Personas ({clusterPersonas.length})</CardTitle>
                  <CardDescription>Language personas in this cluster</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Tone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clusterPersonas.map((persona: LanguagePersona) => (
                        <TableRow key={persona.metadata.name}>
                          <TableCell className="font-light">
                            <Link
                              href={`/clusters/${clusterName}/personas/${persona.metadata.name}`}
                              className="hover:underline"
                            >
                              {persona.metadata.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {persona.spec.tone ? (
                              <Badge className="bg-muted text-muted-foreground" variant="secondary">
                                {persona.spec.tone}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <AnimatedStatus status={persona.status?.phase || 'Unknown'} size="sm" />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(persona.metadata.creationTimestamp)}
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
                                  <Link href={`/clusters/${clusterName}/personas/${persona.metadata.name}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/clusters/${clusterName}/personas/${persona.metadata.name}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeletingPersona(persona.metadata.name!)}
                                  disabled={deletePersona.isPending}
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
          </>
        )}

        {/* Persona Events */}
        <EventsActivity
          title="Persona Events"
          description="Recent events for personas in this cluster"
          clusterName={clusterName}
          resourceType="persona"
          limit={10}
          showNamespace={false}
        />
        <DeleteResourceDialog
          open={!!deletingPersona}
          onOpenChange={(open) => !open && setDeletingPersona(null)}
          resourceType="persona"
          resourceName={deletingPersona ?? undefined}
          isLoading={deletePersona.isPending}
          onConfirm={handleConfirmDelete}
        />
    </div>
  )
}