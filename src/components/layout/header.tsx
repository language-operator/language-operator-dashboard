'use client'

import { signOut, useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectionStatus } from '@/components/ui/connection-status'
import { useWatchClusters } from '@/hooks/use-watch'

export function Header() {
  const { data: session } = useSession()

  const watchStatus = useWatchClusters({
    enabled: true,
    onEvent: (event) => {
      console.log('Header received watch event:', event.type, event.resource)
    }
  })

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="flex h-16 items-center justify-between bg-gradient-to-b from-stone-100 to-stone-200 border-b border-stone-800/80 px-6 dark:from-stone-900 dark:to-stone-950 dark:border-stone-600/80">
      <div className="flex items-center gap-4">
        {/* Left side — reserved for breadcrumbs or context info */}
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus
          isConnected={watchStatus.isConnected}
          lastEvent={watchStatus.lastEvent}
          connectionError={watchStatus.connectionError}
          reconnectCount={watchStatus.reconnectCount}
          onReconnect={watchStatus.reconnect}
        />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar>
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-light text-stone-900 dark:text-stone-300">{session?.user?.name}</p>
                <p className="text-[11px] font-light text-stone-600 dark:text-stone-400">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings/profile" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
