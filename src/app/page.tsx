import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Root page redirects authenticated users to the clusters page.
 * K8s RBAC handles access control — no organization context needed.
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  redirect('/clusters')
}
