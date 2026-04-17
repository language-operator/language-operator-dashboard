'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  const { data: session } = useSession()

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    const parts = name.split(/[:/]/)
    const last = parts[parts.length - 1]
    return last.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light">Profile</h1>
        <p className="text-stone-600 dark:text-stone-400">Your Kubernetes identity for this session</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Authenticated via Kubernetes bearer token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-mono">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-mono text-stone-900 dark:text-stone-100 break-all">
                {session?.user?.name ?? session?.user?.id ?? '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-status-ready text-status-ready-foreground">
              Active
            </Badge>
            <span className="text-sm text-stone-600 dark:text-stone-400">
              Session is active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
