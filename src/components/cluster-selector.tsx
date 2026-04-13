'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useClusterContext } from '@/contexts/cluster-context'
import { useClusters } from '@/hooks/use-clusters'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Boxes, ChevronDown, Plus } from 'lucide-react'
import { AnimatedStatus } from '@/components/ui/animated-status'

export function ClusterSelector() {
  const router = useRouter()
  const { selectedCluster, setSelectedCluster } = useClusterContext()
  const { data: clustersData, isLoading } = useClusters({ limit: 100 })
  const clusters = clustersData?.data || []

  const handleClusterSelect = (clusterName: string) => {
    setSelectedCluster(clusterName)
    router.push(`/clusters/${clusterName}`)
  }

  const selectedClusterData = clusters.find((c: any) => c.metadata?.name === selectedCluster)

  return (
    <div className="border-b h-[52px]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between text-accent hover:text-foreground hover:bg-transparent"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 mr-1" />
              {selectedCluster ? (
                <span className="truncate">{selectedCluster}</span>
              ) : (
                <span className="">Select Cluster</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          {clusters.length > 0 ? (
            <>
              {clusters.map((cluster: any) => (
                <DropdownMenuItem
                  key={cluster.metadata?.name}
                  onClick={() => handleClusterSelect(cluster.metadata?.name!)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    <span>{cluster.metadata?.name}</span>
                  </div>
                  {cluster.status?.phase && (
                    <AnimatedStatus status={cluster.status.phase} size="sm" showIcon={false} />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : 'No clusters found'}
            </div>
          )}
          <DropdownMenuItem asChild>
            <Link href={'/clusters/new'} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Cluster
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={'/clusters'} className="flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Manage All Clusters
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}