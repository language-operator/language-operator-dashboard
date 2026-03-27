import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Authentication middleware for Language Operator Dashboard.
 *
 * Access control is enforced by Kubernetes RBAC via user impersonation —
 * the dashboard makes K8s API calls as the logged-in user's email identity,
 * so K8s naturally restricts what each user can see and do.
 *
 * This middleware only handles:
 * - Redirecting unauthenticated requests to /login
 * - Adding security headers
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through auth, health, and Next.js internal routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  const token = await getToken({ req: request })

  if (!token?.sub) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
