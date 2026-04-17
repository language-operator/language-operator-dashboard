import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    k8sToken?: string
  }
}
