import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt', // CredentialsProvider requires JWT sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 [AUTH] Starting authorization for:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [AUTH] Missing credentials')
          throw new Error('Invalid credentials')
        }

        console.log('🔍 [AUTH] Looking up user in database...')
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          console.log('❌ [AUTH] User not found')
          throw new Error('Invalid credentials')
        }

        if (!user.password) {
          console.log('❌ [AUTH] User has no password')
          throw new Error('Invalid credentials')
        }

        console.log('🔑 [AUTH] Comparing password...')
        const isValidPassword = await compare(credentials.password, user.password)

        if (!isValidPassword) {
          console.log('❌ [AUTH] Password mismatch')
          throw new Error('Invalid credentials')
        }

        console.log('✅ [AUTH] Authentication successful for:', user.email)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Store user ID in JWT token when user first logs in
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      // With JWT sessions, user ID and email come from token
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  debug: true, // Force debug mode to see what's happening
}
