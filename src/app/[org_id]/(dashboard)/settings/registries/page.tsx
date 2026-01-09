'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Package, AlertCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useOrganization } from '@/components/organization-provider'
import { fetchWithOrganization } from '@/lib/api-client'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Registry {
  id: string
  pattern: string
  isSystem: boolean
}

export default function RegistrySettingsPage() {
  const { isAdmin } = useOrganization()
  const [registries, setRegistries] = useState<Registry[]>([])
  const [newRegistry, setNewRegistry] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingRegistry, setDeletingRegistry] = useState<Registry | null>(null)

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
          <span>Access denied. Admin privileges required to manage registries.</span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchRegistries()
  }, [])

  const fetchRegistries = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithOrganization('/api/admin/registries')
      
      if (!response.ok) {
        throw new Error('Failed to fetch registries')
      }
      
      const data = await response.json()
      setRegistries(data.registries || [])
    } catch (error) {
      console.error('Error fetching registries:', error)
      toast.error('Failed to load registry settings')
    } finally {
      setIsLoading(false)
    }
  }

  const saveRegistries = async (updatedRegistries: Registry[]) => {
    try {
      setIsSaving(true)
      
      const response = await fetchWithOrganization('/api/admin/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          registries: updatedRegistries.map(r => r.pattern) 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update registries')
      }

      setRegistries(updatedRegistries)
      toast.success('Registry settings updated successfully')
    } catch (error) {
      console.error('Error updating registries:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update registries')
    } finally {
      setIsSaving(false)
    }
  }

  const addRegistry = async () => {
    if (!newRegistry.trim()) {
      toast.error('Please enter a registry pattern')
      return
    }

    // Basic validation
    if (!isValidRegistryPattern(newRegistry.trim())) {
      toast.error('Invalid registry pattern. Use format: registry.com or *.registry.com')
      return
    }

    // Check for duplicates
    if (registries.some(r => r.pattern === newRegistry.trim())) {
      toast.error('Registry pattern already exists')
      return
    }

    const newRegistryObj: Registry = {
      id: Date.now().toString(),
      pattern: newRegistry.trim(),
      isSystem: false
    }

    await saveRegistries([...registries, newRegistryObj])
    setNewRegistry('')
  }

  const removeRegistry = async (registry: Registry) => {
    if (registry.isSystem) {
      toast.error('Cannot remove system registries')
      return
    }

    const updatedRegistries = registries.filter(r => r.id !== registry.id)
    await saveRegistries(updatedRegistries)
    setDeletingRegistry(null)
  }

  const isValidRegistryPattern = (pattern: string): boolean => {
    if (!pattern || pattern.length === 0) return false
    
    // Basic validation for registry patterns
    // Allow: domain.com, subdomain.domain.com, *.domain.com
    const registryRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    
    return registryRegex.test(pattern)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Registry Settings</h1>
            <p className="text-stone-600 dark:text-stone-400">Manage allowed container registries</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-stone-200 w-1/4 mb-2 dark:bg-stone-700"></div>
                <div className="h-3 bg-stone-200 w-1/2 mb-4 dark:bg-stone-700"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registry Settings</h1>
          <p className="text-stone-600 dark:text-stone-400">Manage allowed container registries for deployments</p>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="registry.example.com or *.example.com"
            value={newRegistry}
            onChange={(e) => setNewRegistry(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addRegistry()}
            className="w-80"
          />
          <Button 
            onClick={addRegistry}
            disabled={isSaving || !newRegistry.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Registry
          </Button>
        </div>
      </div>

      {/* Registry Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Container Registry Whitelist
          </CardTitle>
          <CardDescription>
            Manage allowed registries for LanguageTool and LanguageAgent container images. 
            Wildcard patterns (*.gcr.io) are supported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registry Pattern</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-stone-100 border border-stone-200 flex items-center justify-center mb-4 dark:bg-stone-800 dark:border-stone-700">
                        <Package className="w-6 h-6 text-stone-400 dark:text-stone-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No registries configured</h3>
                      <p className="text-stone-600 dark:text-stone-400 mb-4">
                        Add a registry pattern to allow container images from specific registries
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                registries.map((registry) => (
                  <TableRow key={registry.id}>
                    <TableCell>
                      <code className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-sm">
                        {registry.pattern}
                      </code>
                    </TableCell>
                    <TableCell>
                      {registry.isSystem ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          System
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!registry.isSystem && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => setDeletingRegistry(registry)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Registry
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Registry Dialog */}
      <AlertDialog 
        open={!!deletingRegistry} 
        onOpenChange={(open) => !open && setDeletingRegistry(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Registry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingRegistry?.pattern}</strong> from the whitelist? 
              This will prevent new deployments from using images from this registry.
              <p className="mt-2 font-medium text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRegistry && removeRegistry(deletingRegistry)}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Removing...' : 'Remove Registry'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}