'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe } from 'lucide-react'

export default function ModelNetworkPage() {
  useParams()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Policy
          </CardTitle>
          <CardDescription>
            External network access rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Globe className="h-8 w-8 text-stone-500 dark:text-stone-400 mx-auto mb-2" />
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Network policies are not configurable on models
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">
              Model access is controlled at the cluster level
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
