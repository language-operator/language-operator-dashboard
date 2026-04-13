'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchWithOrganization } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, AlertCircle, ArrowLeft,
  Edit, Trash2, MoreVertical, FileCode, Copy, Check
} from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { usePersona, useDeletePersona } from '@/hooks/use-personas'
import { LanguagePersona } from '@/types/persona'
import { Skeleton } from '@/components/ui/skeleton'
import { ResourceHeader } from '@/components/ui/resource-header'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ResourceEventsActivity } from '@/components/ui/events-activity'
import { DeleteResourceDialog } from '@/components/ui/delete-resource-dialog'
import { toast } from 'sonner'
import { AnimatedStatus } from '@/components/ui/animated-status'
import { formatTimeAgo } from '@/lib/format'
import { Spinner } from '@/components/ui/spinner'

export default function ClusterPersonaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const personaName = params?.personaName as string
  const [yamlModalOpen, setYamlModalOpen] = useState(false)
  const [yamlContent, setYamlContent] = useState('')
  const [yamlLoading, setYamlLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { theme } = useTheme()

  const { data: personaResponse, isLoading, error } = usePersona(personaName, clusterName)
  const deletePersona = useDeletePersona(clusterName)

  const persona = personaResponse?.data?.persona

  const handleDeletePersona = () => {
    if (!persona?.metadata.name) return
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!persona?.metadata.name) return
    const name = persona.metadata.name
    deletePersona.mutateAsync(name)
      .then(() => router.push(`/clusters/${clusterName}/personas`))
      .catch(() => toast.error('Failed to delete persona. Please try again.'))
  }

  const handleBack = () => {
    router.push(`/clusters/${clusterName}/personas`)
  }

  const handleViewYaml = async () => {
    setYamlModalOpen(true)
    setYamlLoading(true)
    try {
      const response = await fetchWithOrganization(`/api/clusters/${clusterName}/personas/${personaName}/yaml`)
      if (!response.ok) {
        throw new Error('Failed to fetch YAML')
      }
      const yaml = await response.text()
      setYamlContent(yaml)
    } catch {
      setYamlContent('Error loading YAML content')
    } finally {
      setYamlLoading(false)
    }
  }

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  if (error || !persona) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-light mb-2">Persona not found</h3>
            <p className="text-muted-foreground mb-4">
              The persona &quot;{personaName}&quot; could not be found in cluster &quot;{clusterName}&quot;.
            </p>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Personas
            </Button>
          </div>
        </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <ResourceHeader
          backHref={`/clusters/${clusterName}/personas`}
          backLabel="Back to Personas"
          icon={Users}
          title={
            <div className="flex items-center space-x-3">
              <span>{persona.metadata?.name}</span>
              <div className="flex items-center space-x-2">
                <AnimatedStatus status={persona.status?.phase || 'Unknown'} size="sm" />
              </div>
            </div>
          }
          subtitle="LanguagePersona"
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/clusters/${clusterName}/personas/${personaName}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleViewYaml}>
                    <FileCode className="h-4 w-4 mr-2" />
                    View YAML
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeletePersona}
                    disabled={deletePersona.isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletePersona.isPending ? 'Deleting...' : 'Delete Persona'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {/* Overview */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-light text-muted-foreground">Name</p>
                <p className="text-sm">{persona.metadata?.name}</p>
              </div>
              {persona.spec?.tone && (
                <div>
                  <p className="text-sm font-light text-muted-foreground">Tone</p>
                  <Badge variant="secondary">{persona.spec.tone}</Badge>
                </div>
              )}
              <div>
                <p className="text-sm font-light text-muted-foreground">Status</p>
                <AnimatedStatus status={persona.status?.phase || 'Unknown'} size="sm" />
              </div>
              <div>
                <p className="text-sm font-light text-muted-foreground">Created</p>
                <p className="text-sm">{formatTimeAgo(persona.metadata?.creationTimestamp)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Personality */}
          {persona.spec?.personality && (
            <Card>
              <CardHeader>
                <CardTitle>Personality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-stone-50 border border-stone-200 p-4 dark:bg-stone-800/50 dark:border-stone-700">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-stone-900 dark:text-stone-300">
                    {persona.spec.personality}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expertise */}
          {persona.spec?.expertise && (
            <Card>
              <CardHeader>
                <CardTitle>Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-stone-50 border border-stone-200 p-4 dark:bg-stone-800/50 dark:border-stone-700">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-stone-900 dark:text-stone-300">
                    {persona.spec.expertise}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Persona Events */}
        <ResourceEventsActivity
          resourceType="persona"
          resourceName={personaName}
          namespace={persona.metadata?.namespace}
          limit={15}
        />
      </div>

      <DeleteResourceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resourceType="persona"
        resourceName={persona?.metadata.name}
        isLoading={deletePersona.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* YAML Modal */}
      <Dialog open={yamlModalOpen} onOpenChange={setYamlModalOpen}>
        <DialogContent className="w-[85vw] !max-w-[85vw] max-h-[85vh] flex flex-col sm:!max-w-[85vw] md:!max-w-[85vw] lg:!max-w-[85vw]">
          <DialogHeader>
            <DialogTitle>LanguagePersona YAML</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col">
            {yamlLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : (
              <div className="border flex-1 min-h-0 flex flex-col">
                <div className="bg-muted p-3 border-b flex justify-between items-center">
                  <span className="font-light text-sm">
                    {persona?.metadata.name || personaName}.yaml
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyYaml}
                    disabled={!yamlContent || yamlContent.startsWith('Error')}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {yamlContent.startsWith('Error') ? (
                    <div className="p-4 text-red-600 font-mono text-sm">
                      {yamlContent}
                    </div>
                  ) : (
                    <SyntaxHighlighter
                      language="yaml"
                      style={theme === 'dark' ? oneDark : oneLight}
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        height: '100%',
                        overflow: 'auto'
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                        }
                      }}
                    >
                      {yamlContent}
                    </SyntaxHighlighter>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
