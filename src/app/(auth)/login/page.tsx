'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        token,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid or expired token')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50/30 to-neutral-100 dark:from-neutral-950 dark:via-stone-900/50 dark:to-stone-950 flex items-center justify-center p-8">
      {/* Judd-inspired geometric container */}
      <div className="w-full max-w-[480px]">
        {/* Precise rectangular form */}
        <Card className="gap-0 py-0">
          {/* Header - stark typography */}
          <CardHeader className="border-b border-stone-800/80 dark:border-stone-600/80 p-12">
            <h1 className="text-[13px] font-light tracking-[0.2em] uppercase text-stone-900 dark:text-stone-300 flex items-center gap-1">
              Language Operator
              <span className="inline-block w-2 h-3.5 bg-stone-900 dark:bg-amber-400 animate-pulse" />
            </h1>
          </CardHeader>

          {/* Content area - generous spacing */}
          <CardContent className="p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="token"
                  className="block text-[10px] tracking-[0.2em] uppercase font-light text-stone-600 dark:text-stone-400"
                >
                  Bearer Token
                </label>
                <textarea
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  required
                  rows={4}
                  placeholder="Paste your Kubernetes bearer token"
                  className="w-full border border-stone-200 px-4 py-3 text-sm font-light font-mono focus:outline-none focus:border-amber-900/40 focus:ring-1 focus:ring-amber-900/20 transition-all disabled:opacity-50 bg-stone-50/30 dark:bg-stone-800/30 dark:border-stone-600 dark:text-stone-300 dark:focus:border-amber-600/60 dark:focus:ring-amber-600/30 resize-none"
                />
                <p className="text-[10px] font-light text-stone-500 dark:text-stone-500">
                  kubectl create token langop-dashboard-admin -n language-operator
                </p>
              </div>

              {error && (
                <div className="text-[11px] font-light text-stone-900 dark:text-stone-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="w-full h-12 bg-gradient-to-r from-stone-800 to-stone-950 text-stone-50 text-[11px] tracking-[0.15em] uppercase font-light hover:from-amber-900 hover:to-amber-950 transition-all duration-300 disabled:opacity-50 shadow-[0_2px_8px_rgba(120,53,15,0.12)] dark:from-stone-700 dark:to-stone-800 dark:hover:from-amber-600 dark:hover:to-orange-600 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              >
                {isLoading ? 'Verifying' : 'Sign In'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
