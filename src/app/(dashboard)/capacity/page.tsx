import { ResourceHeader } from '@/components/ui/resource-header'
import { Server } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function CapacityPage() {
  return (
    <div className="space-y-6">
      <ResourceHeader
        icon={Server}
        title="Capacity"
        subtitle="Monitor resource consumption and plan limits across clusters"
      />
      <Card>
        <CardContent className="p-8 text-center text-stone-500 dark:text-stone-400">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Cluster capacity metrics will be available once the operator exposes{' '}
            <code className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5">
              status.capacity
            </code>{' '}
            on the LanguageCluster CRD.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
