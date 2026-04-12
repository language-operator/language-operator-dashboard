// TypeScript types for LanguagePersona CRD
// Mirrors language-operator/src/api/v1alpha1/languagepersona_types.go

import { V1Condition, V1ObjectMeta } from '@kubernetes/client-node'

// LanguagePersona CRD Types
export interface LanguagePersona {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguagePersona'
  metadata: V1ObjectMeta
  spec: LanguagePersonaSpec
  status?: LanguagePersonaStatus
}

export interface LanguagePersonaList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguagePersonaList'
  metadata: V1ObjectMeta
  items: LanguagePersona[]
}

export interface LanguagePersonaSpec {
  // Communication style (e.g. "professional", "concise and direct")
  tone?: string

  // Character and behavioural traits (e.g. "curious and methodical")
  personality?: string

  // Domain knowledge and skills (e.g. "senior Go engineer")
  expertise?: string
}

export interface LanguagePersonaStatus {
  phase?: 'Pending' | 'Ready' | 'Failed'
  conditions?: V1Condition[]
  observedGeneration?: number
}

// Frontend-specific form type
export interface LanguagePersonaFormData {
  name: string
  namespace: string
  tone?: string
  personality?: string
  expertise?: string
}

export interface LanguagePersonaListItem {
  name: string
  namespace: string
  tone?: string
  personality?: string
  phase?: string
  age: string
  creationTimestamp: string
}

// API response types
export interface LanguagePersonaResponse {
  success: boolean
  data?: LanguagePersona
  error?: string
}

export interface LanguagePersonaListResponse {
  success: boolean
  data?: LanguagePersona[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing personas
export interface LanguagePersonaListParams {
  namespace?: string
  labelSelector?: string
  fieldSelector?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'tone' | 'phase' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
  tone?: string[]
  phase?: string[]
}
