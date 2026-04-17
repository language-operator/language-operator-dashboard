// Environment variable validation and helpers
import { z } from 'zod'

const envSchema = z.object({
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Build environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CI: z.string().optional(),

  // Kubernetes (optional for development)
  KUBECONFIG: z.string().optional(),

  // Organization namespace prefix
  LANGOP_ORGANIZATION_NAMESPACE_PREFIX: z.string().optional(),
})

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.warn('Environment validation warnings:', error)
    return process.env
  }
}

export const env = validateEnv()

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isCIBuild = Boolean(env.CI)

// Get organization namespace prefix (defaults to "language-operator-")
export const getOrganizationNamespacePrefix = () =>
  env.LANGOP_ORGANIZATION_NAMESPACE_PREFIX || 'language-operator-'

export default env
