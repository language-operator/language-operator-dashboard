import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from './auth'

export interface AuthenticatedUser {
  userId: string
  email: string
}

/**
 * Get the authenticated user from the current request session.
 * Replaces getUserOrganization() — returns only user identity.
 * K8s RBAC (via impersonation) handles what the user is permitted to do.
 */
export async function getAuthenticatedUser(_request?: NextRequest): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session?.user?.email) {
    throw new Error('Authentication required')
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  }
}
