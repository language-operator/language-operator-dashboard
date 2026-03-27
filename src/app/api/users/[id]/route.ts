import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: {
            expires: true
          },
          orderBy: {
            expires: 'desc'
          },
          take: 1
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const lastSession = user.sessions[0]
    const isActive = lastSession && lastSession.expires > new Date()

    const userData = {
      id: user.id,
      name: user.name || 'Unnamed User',
      email: user.email,
      image: user.image,
      status: isActive ? 'active' : 'inactive',
      lastSeen: lastSession ? lastSession.expires : user.createdAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      memberships: [],
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    const updateData: any = {}
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: { expires: true },
          orderBy: { expires: 'desc' },
          take: 1
        }
      }
    })

    const lastSession = updatedUser.sessions[0]
    const isActive = lastSession && lastSession.expires > new Date()

    const userData = {
      id: updatedUser.id,
      name: updatedUser.name || 'Unnamed User',
      email: updatedUser.email,
      image: updatedUser.image,
      status: isActive ? 'active' : 'inactive',
      lastSeen: lastSession ? lastSession.expires : updatedUser.createdAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      memberships: [],
    }

    return NextResponse.json(userData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
