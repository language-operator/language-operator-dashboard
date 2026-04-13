'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClusters } from '@/hooks/use-clusters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Boxes, ExternalLink, Users } from 'lucide-react'
import { AnimatedStatus } from '@/components/ui/animated-status'
import { LanguageCluster } from '@/types/cluster'

interface ClusterSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onClusterSelect: (clusterName: string) => void
  actionType: 'agent' | 'model' | 'tool'
  actionTitle: string
  actionDescription: string
}

export function ClusterSelectionModal({
  isOpen,
  onClose,
  onClusterSelect,
  actionType,
  actionTitle,
  actionDescription,
}: ClusterSelectionModalProps) {
  const router = useRouter()
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const { data: clustersData, isLoading, error } = useClusters({ limit: 100 })
  const clusters = clustersData?.data || []

  const handleContinue = () => {
    if (selectedCluster) {
      onClusterSelect(selectedCluster)
      onClose()
      setSelectedCluster(null) // Reset for next time
    }
  }

  const handleCancel = () => {
    onClose()
    setSelectedCluster(null) // Reset selection
  }

  const getActionIcon = () => {
    switch (actionType) {
      case 'agent':
        return <Users className="h-5 w-5 text-muted-foreground" />
      case 'model':
        return <Boxes className="h-5 w-5 text-muted-foreground" />
      case 'tool':
        return <ExternalLink className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon()}
            {actionTitle}
          </DialogTitle>
          <DialogDescription>
            {actionDescription} Please select a cluster to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading clusters...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-red-500">Error loading clusters</div>
            </div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-8">
              <Boxes className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-light text-gray-900 mb-2">No clusters available</h3>
              <p className="text-sm text-gray-500 mb-4">
                You need to create a cluster before you can {actionType === 'agent' ? 'deploy agents' : actionType === 'model' ? 'add models' : 'configure tools'}.
              </p>
              <Button 
                onClick={() => router.push('/clusters/new')}
                variant="outline"
                className="gap-2"
              >
                <Boxes className="h-4 w-4" />
                Create First Cluster
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-light text-muted-foreground mb-3">
                Available Clusters ({clusters.length})
              </div>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {clusters.map((cluster: LanguageCluster) => (
                  <div
                    key={cluster.metadata?.name}
                    className={`p-3 border cursor-pointer transition-all ${
                      selectedCluster === cluster.metadata?.name
                        ? 'border-accent bg-accent/10'
                        : 'border-muted hover:border-border hover:bg-muted'
                    }`}
                    onClick={() => setSelectedCluster(cluster.metadata?.name || '')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Boxes className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-light text-sm">
                            {cluster.metadata?.name}
                          </div>
                          {cluster.spec?.domain && (
                            <div className="text-xs text-muted-foreground">
                              {cluster.spec.domain}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cluster.status?.phase && (
                          <AnimatedStatus status={cluster.status.phase} size="sm" showIcon={false} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleContinue} 
            disabled={!selectedCluster || clusters.length === 0}
          >
            Continue with {selectedCluster || 'Selected Cluster'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}