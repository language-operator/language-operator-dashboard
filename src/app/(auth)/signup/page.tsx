import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="w-full max-w-md space-y-6 px-8 text-center">
        <h1 className="text-2xl font-light tracking-widest uppercase text-stone-900 dark:text-stone-100">
          Language Operator
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Account creation is managed by your administrator.
          Contact them to request access.
        </p>
        <Link
          href="/login"
          className="block text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}
