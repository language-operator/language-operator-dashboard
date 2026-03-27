import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClusterProvider } from '@/contexts/cluster-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

// Force dynamic rendering - these pages depend on authentication
export const dynamic = 'force-dynamic'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <ClusterProvider>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-stone-100 via-amber-50/30 to-neutral-100 dark:from-neutral-950 dark:via-stone-900/50 dark:to-stone-950">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-generous relative">
            {children}
          </main>
        </div>
      </div>
    </ClusterProvider>
  )
}
