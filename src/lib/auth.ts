import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { k8sClient } from '@/lib/k8s-client'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — matches typical SA token lifetime
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'k8s-token',
      credentials: {
        token: { label: 'Bearer Token', type: 'password' },
      },
      async authorize(credentials) {
        const token = credentials?.token?.trim()
        if (!token) throw new Error('Token required')

        const username = await k8sClient.validateToken(token)
        return { id: username, name: username, k8sToken: token }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.k8sToken = (user as { k8sToken?: string }).k8sToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
}
