import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
    },
  })
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Profile editing is not supported in this configuration' },
    { status: 405 }
  )
}
