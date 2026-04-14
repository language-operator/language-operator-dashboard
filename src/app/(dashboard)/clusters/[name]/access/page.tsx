'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Shield, Plus, Trash2, UserCircle } from 'lucide-react'
import { useAccess, useGrantAccess, useRevokeAccess } from '@/hooks/use-access'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { formatTimeAgoCondensed } from '@/lib/format'

const ROLE_LABELS: Record<string, string> = {
  'langop-cluster-admin': 'Admin',
  'langop-cluster-viewer': 'Viewer',
}

const ROLE_VARIANTS: Record<string, 'role-admin' | 'role-viewer'> = {
  'langop-cluster-admin': 'role-admin',
  'langop-cluster-viewer': 'role-viewer',
}


function GrantAccessDialog({ clusterName }: { clusterName: string }) {
  const [open, setOpen] = React.useState(false)
  const [userEmail, setUserEmail] = React.useState('')
  const [role, setRole] = React.useState('langop-cluster-viewer')
  const [error, setError] = React.useState('')

  const { mutate: grantAccess, isPending } = useGrantAccess(clusterName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!userEmail.trim()) {
      setError('Email is required')
      return
    }
    grantAccess(
      { userEmail: userEmail.trim(), role },
      {
        onSuccess: () => {
          setOpen(false)
          setUserEmail('')
          setRole('langop-cluster-viewer')
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Grant Access
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Cluster Access</DialogTitle>
          <DialogDescription>
            Bind a user's email to a cluster role. The user must already be able to authenticate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="langop-cluster-viewer">Viewer — read-only access</SelectItem>
                <SelectItem value="langop-cluster-admin">Admin — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Granting…' : 'Grant Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ClusterAccessPage() {
  const params = useParams()
  const clusterName = params?.name as string
  const [revoking, setRevoking] = React.useState<{ bindingName: string; description: string } | null>(null)

  const { data: accessResponse, isLoading, error } = useAccess(clusterName)
  const revokeAccessMutation = useRevokeAccess(clusterName)

  const bindings = accessResponse?.data ?? []

  const handleConfirmRevoke = () => {
    if (!revoking) return
    const { bindingName } = revoking
    revokeAccessMutation.mutateAsync(bindingName)
      .then(() => setRevoking(null))
      .catch(() => toast.error('Failed to revoke access. Please try again.'))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading access bindings…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResourceHeader
        icon={Shield}
        title="Access"
        subtitle="Manage who can access this cluster"
        actions={<GrantAccessDialog clusterName={clusterName} />}
      />

      {error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            <p className="text-sm">{(error as Error).message}</p>
          </CardContent>
        </Card>
      ) : bindings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-stone-400 mb-4 opacity-30" />
            <CardTitle className="text-xl mb-2">No access bindings</CardTitle>
            <CardDescription className="text-center max-w-md mb-6">
              No users have been explicitly granted access to this cluster yet.
              Use <strong>Grant Access</strong> to add a user.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Access Bindings ({bindings.length})</CardTitle>
            <CardDescription>
              Users with explicit access to this cluster via K8s RoleBindings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bindings.map((binding) =>
                  binding.subjects.map((subject) => (
                    <TableRow key={`${binding.name}-${subject.name}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-stone-400" />
                          <span className="font-mono text-sm">{subject.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANTS[binding.role] ?? 'secondary'}>
                          {ROLE_LABELS[binding.role] ?? binding.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgoCondensed(binding.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevoking({
                            bindingName: binding.name,
                            description: `Revoke ${ROLE_LABELS[binding.role] ?? binding.role} access for ${subject.name}? This action cannot be undone.`,
                          })}
                          disabled={revokeAccessMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <DeleteResourceDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        resourceType="access"
        resourceName={undefined}
        title="Revoke Access"
        description={revoking?.description}
        actionLabel="Revoke"
        isLoading={revokeAccessMutation.isPending}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  )
}
