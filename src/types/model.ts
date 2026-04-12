// TypeScript types for LanguageModel CRD
// Mirrors language-operator/src/api/v1alpha1/languagemodel_types.go

import { V1Condition, V1ObjectMeta } from '@kubernetes/client-node'

// LanguageModel CRD Types
export interface LanguageModel {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageModel'
  metadata: V1ObjectMeta
  spec: LanguageModelSpec
  status?: LanguageModelStatus
}

export interface LanguageModelList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageModelList'
  metadata: V1ObjectMeta
  items: LanguageModel[]
}

export interface SecretReference {
  name: string
  key?: string
}

export interface RateLimitSpec {
  requestsPerMinute?: number
  tokensPerMinute?: number
}

export interface LanguageModelSpec {
  // LLM provider
  provider: 'openai' | 'anthropic' | 'openai-compatible' | 'azure' | 'bedrock' | 'vertex' | 'custom'

  // Specific model identifier (e.g. "gpt-4o", "claude-3-5-sonnet-20241022")
  modelName: string

  // API endpoint URL (required for openai-compatible, azure, custom)
  endpoint?: string

  // Secret containing the API key
  apiKeySecretRef?: SecretReference

  // Rate limiting
  rateLimits?: RateLimitSpec

  // Request timeout (e.g. "5m", "30s")
  timeout?: string
}

export interface LanguageModelStatus {
  phase?: 'Pending' | 'Ready' | 'Failed'
  conditions?: V1Condition[]
  message?: string
  observedGeneration?: number
}

// Frontend-specific form type
export interface LanguageModelFormData {
  name: string
  namespace: string
  provider: 'openai' | 'anthropic' | 'openai-compatible' | 'azure' | 'bedrock' | 'vertex' | 'custom'
  modelName: string
  endpoint?: string
  apiKeySecretName?: string
  apiKeySecretKey?: string
  requestsPerMinute?: number
  tokensPerMinute?: number
  timeout?: string
}

export interface LanguageModelListItem {
  name: string
  namespace: string
  provider: string
  modelName: string
  phase?: string
  age: string
  creationTimestamp: string
}

// API response types
export interface LanguageModelResponse {
  success: boolean
  data?: LanguageModel
  error?: string
}

export interface LanguageModelListResponse {
  success: boolean
  data?: LanguageModel[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing models
export interface LanguageModelListParams {
  namespace?: string
  labelSelector?: string
  fieldSelector?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'provider' | 'phase' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
  provider?: string[]
  phase?: string[]
}
