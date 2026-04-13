'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Cpu,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { useRuntimes, useDeleteRuntime } from '@/hooks/use-runtimes'
import { LanguageAgentRuntime, RuntimeType, inferRuntimeType } from '@/types/runtime'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/format'

const runtimeTypeBadgeVariant: Record<RuntimeType, 'default' | 'secondary' | 'outline'> = {
  'claude-code': 'default',
  'opencode': 'secondary',
  'openclaw': 'secondary',
  'custom': 'outline',
}

function RuntimeTypeBadge({ type }: { type: RuntimeType }) {
  return (
    <Badge variant={runtimeTypeBadgeVariant[type]} className="font-mono text-xs">
      {type}
    </Badge>
  )
}

export default function RuntimesPage() {
  const [search, setSearch] = useState('')

  const { data: runtimesResponse, isLoading, error, refetch } = useRuntimes({
    search: search || undefined,
    limit: 100,
  })

  const deleteRuntime = useDeleteRuntime()
  const [deletingRuntime, setDeletingRuntime] = useState<string | null>(null)

  const runtimes: LanguageAgentRuntime[] = runtimesResponse?.data || []

  const handleConfirmDelete = () => {
    if (!deletingRuntime) return
    const name = deletingRuntime
    deleteRuntime.mutateAsync(name)
      .then(() => setDeletingRuntime(null))
      .catch(() => toast.error('Failed to delete runtime. Please try again.'))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-light mb-2">Failed to load runtimes</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading LanguageAgentRuntimes.
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        icon={Cpu}
        title="Runtimes"
        subtitle="Cluster-scoped presets for agent deployments"
        actions={
          <Link href="/runtimes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Runtime
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search runtimes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Runtimes ({runtimes.length})</CardTitle>
          <CardDescription>
            Agent runtime presets available cluster-wide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runtimes.map((runtime) => (
                <TableRow key={runtime.metadata.name}>
                  <TableCell className="font-light">
                    <Link
                      href={`/runtimes/${runtime.metadata.name}`}
                      className="hover:underline"
                    >
                      {runtime.metadata.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RuntimeTypeBadge type={inferRuntimeType(runtime.spec)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-muted-foreground">
                      {runtime.spec.image || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(runtime.metadata.creationTimestamp)}
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
                          <Link href={`/runtimes/${runtime.metadata.name}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/runtimes/${runtime.metadata.name}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingRuntime(runtime.metadata.name!)}
                          disabled={deleteRuntime.isPending}
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

          {runtimes.length === 0 && (
            <div className="text-center py-8">
              <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-light mb-2">No runtimes found</h3>
              <p className="text-muted-foreground mb-4">
                Create a runtime preset to provide default configuration for agent deployments.
              </p>
              <Link href="/runtimes/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Runtime
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      <DeleteResourceDialog
        open={!!deletingRuntime}
        onOpenChange={(open) => !open && setDeletingRuntime(null)}
        resourceType="runtime"
        resourceName={deletingRuntime ?? undefined}
        isLoading={deleteRuntime.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
