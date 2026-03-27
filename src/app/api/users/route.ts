import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const usersWithStatus = users.map(user => {
      const lastSession = user.sessions[0]
      const isActive = lastSession && lastSession.expires > new Date()

      return {
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
    })

    return NextResponse.json(usersWithStatus)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Hash the password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'User with this email already exists'
      }, { status: 400 })
    }

    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    const userData = {
      id: newUser.id,
      name: newUser.name || 'Unnamed User',
      email: newUser.email,
      image: newUser.image,
      status: 'inactive',
      lastSeen: newUser.createdAt,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      memberships: [],
    }

    return NextResponse.json({
      user: userData,
      password: validatedData.password
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
