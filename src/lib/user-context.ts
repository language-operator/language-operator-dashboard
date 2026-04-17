import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

export interface AuthenticatedUser {
  userId: string
  k8sToken: string
}

/**
 * Get the authenticated user's identity and K8s bearer token from the session JWT.
 * The token is used directly for all K8s API calls — no impersonation.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser> {
  const token = await getToken({ req: request })

  if (!token?.sub || !token?.k8sToken) {
    throw new Error('Authentication required')
  }

  return {
    userId: token.sub as string,
    k8sToken: token.k8sToken as string,
  }
}
