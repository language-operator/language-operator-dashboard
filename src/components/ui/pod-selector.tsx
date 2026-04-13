'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Layers, Box, RotateCcw } from 'lucide-react'
import { formatTimeAgoCondensed } from '@/lib/format'

export interface PodInfo {
  name: string
  status: string
  isRunning: boolean
  hasRunningContainers?: boolean
  availableContainers?: Array<{
    name: string
    image: string
    isToolContainer?: boolean
  }>
  deploymentMode?: string
  podType?: string
  creationTimestamp?: string
}

interface PodSelectorProps {
  pods: PodInfo[]
  selectedPod: string | null
  selectedContainer: string | null
  deploymentMode?: string
  podType?: string
  onPodChange: (podName: string) => void
  onContainerChange: (containerName: string) => void
  onRefresh?: () => void
  loading?: boolean
  title?: string
  description?: string
  showModeIndicator?: boolean
  className?: string
  layout?: 'vertical' | 'horizontal'
  hideContainerSelection?: boolean
}

export function PodSelector({
  pods,
  selectedPod,
  selectedContainer,
  deploymentMode = 'service',
  podType = 'pod',
  onPodChange,
  onContainerChange,
  onRefresh,
  loading = false,
  title,
  description,
  showModeIndicator = false,
  className = "",
  layout = 'vertical',
  hideContainerSelection = false
}: PodSelectorProps) {
  const getContainersForPod = (podName: string) => {
    const pod = pods.find(p => p.name === podName)
    return pod?.availableContainers || []
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'text-status-ready-foreground'
      case 'Succeeded': return 'text-muted-foreground'
      case 'Failed': return 'text-destructive'
      case 'Pending': return 'text-status-pending-foreground'
      default: return 'text-muted-foreground'
    }
  }

  if (layout === 'horizontal') {
    return (
      <Card className={`flex-shrink-0 ${className}`}>
        <CardContent className="px-4">
          <div className="flex items-center gap-4">
            {/* Pod Selection */}
            <div className="flex-1">
              <Select 
                value={selectedPod || ''} 
                onValueChange={onPodChange}
                disabled={loading || pods.length === 0}
              >
                <SelectTrigger className="min-w-full">
                  <SelectValue placeholder={loading ? "Loading pods..." : `Select ${podType} pod`} />
                </SelectTrigger>
                <SelectContent className="min-w-96">
                  {pods.map(pod => (
                    <SelectItem key={pod.name} value={pod.name}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${pod.isRunning ? 'bg-accent' : 'bg-muted-foreground'}`} />
                          <span className="font-mono text-sm">{pod.name}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className={`${getStatusColor(pod.status)} text-xs`}>
                            {pod.status}
                          </Badge>
                          {pod.creationTimestamp && (
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgoCondensed(pod.creationTimestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pods.length === 0 && !loading && (
                <span className="text-sm text-muted-foreground">No pods found</span>
              )}
            </div>

            {/* Container Selection - only show if pod has multiple containers and not hidden */}
            {!hideContainerSelection && selectedPod && getContainersForPod(selectedPod).length > 1 && (
              <div className="min-w-48">
                <Select value={selectedContainer || ''} onValueChange={onContainerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select container" />
                  </SelectTrigger>
                  <SelectContent>
                    {getContainersForPod(selectedPod).map(container => (
                      <SelectItem key={container.name} value={container.name}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${container.isToolContainer ? 'bg-accent' : 'bg-muted-foreground'}`} />
                          <span className="font-mono text-sm">{container.name}</span>
                          {container.isToolContainer && (
                            <span className="text-xs bg-muted text-muted-foreground px-1">tool</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="h-[36px] px-2 py-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Vertical layout (original)
  return (
    <Card className={`flex-shrink-0 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {title && (
              <h4 className="text-sm font-medium">{title}</h4>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showModeIndicator && deploymentMode === 'sidecar' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1">
                <Layers className="h-3 w-3" />
                Sidecar Mode
              </div>
            )}
            {showModeIndicator && deploymentMode === 'service' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1">
                <Box className="h-3 w-3" />
                Service Mode
              </div>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="h-[36px] px-2 py-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pod Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {podType === 'agent' ? 'Agent Pod' : podType === 'tool' ? 'Tool Pod' : 'Pod'}
            </label>
            <Select 
              value={selectedPod || ''} 
              onValueChange={onPodChange}
              disabled={loading || pods.length === 0}
            >
              <SelectTrigger className="min-w-full">
                <SelectValue placeholder={loading ? "Loading pods..." : `Select ${podType} pod`} />
              </SelectTrigger>
              <SelectContent className="min-w-96">
                {pods.map(pod => (
                  <SelectItem key={pod.name} value={pod.name}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${pod.isRunning ? 'bg-accent' : 'bg-muted-foreground'}`} />
                        <span className="font-mono text-sm">{pod.name}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className={`${getStatusColor(pod.status)} text-xs`}>
                          {pod.status}
                        </Badge>
                        {pod.creationTimestamp && (
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgoCondensed(pod.creationTimestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pods.length === 0 && !loading && (
              <span className="text-sm text-muted-foreground">No pods found</span>
            )}
          </div>

          {/* Container Selection - only show if pod has multiple containers and not hidden */}
          {!hideContainerSelection && selectedPod && getContainersForPod(selectedPod).length > 1 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Container</label>
              <Select value={selectedContainer || ''} onValueChange={onContainerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select container" />
                </SelectTrigger>
                <SelectContent>
                  {getContainersForPod(selectedPod).map(container => (
                    <SelectItem key={container.name} value={container.name}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${container.isToolContainer ? 'bg-accent' : 'bg-muted-foreground'}`} />
                        <span className="font-mono text-sm">{container.name}</span>
                        {container.isToolContainer && (
                          <span className="text-xs bg-muted text-muted-foreground px-1">tool</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}