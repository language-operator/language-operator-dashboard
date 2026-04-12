// TypeScript types for LanguageTool CRD
// Mirrors language-operator/src/api/v1alpha1/languagetool_types.go

import { V1Condition, V1ObjectMeta } from '@kubernetes/client-node'
import { AgentNetworkPolicies, DeploymentSpec, ToolSchema } from './shared'

// LanguageTool CRD Types
export interface LanguageTool {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageTool'
  metadata: V1ObjectMeta
  spec: LanguageToolSpec
  status?: LanguageToolStatus
}

export interface LanguageToolList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageToolList'
  metadata: V1ObjectMeta
  items: LanguageTool[]
}

export interface LanguageToolSpec {
  // Container image for the tool (required)
  image: string

  // Tool protocol type — only "mcp" is currently implemented
  type?: 'mcp'

  // Deployment mode: shared service (default) or per-agent sidecar
  deploymentMode?: 'service' | 'sidecar'

  // Port the tool listens on (default: 8080)
  port?: number

  // Kubernetes deployment configuration
  deployment?: DeploymentSpec

  // Network policy rules
  networkPolicies?: AgentNetworkPolicies
}

export interface LanguageToolStatus {
  phase?: 'Pending' | 'Running' | 'Failed' | 'Updating' | 'Degraded'
  conditions?: V1Condition[]
  endpoint?: string
  toolSchemas?: ToolSchema[]
  readyReplicas?: number
  availableReplicas?: number
  updatedReplicas?: number
  unavailableReplicas?: number
  observedGeneration?: number
}

// Frontend-specific form type
export interface LanguageToolFormData {
  name: string
  namespace: string
  image: string
  type?: 'mcp'
  deploymentMode?: 'service' | 'sidecar'
  port?: number
}

export interface LanguageToolListItem {
  name: string
  namespace: string
  type?: string
  image?: string
  phase?: string
  endpoint?: string
  age: string
  creationTimestamp: string
}

// API response types
export interface LanguageToolResponse {
  success: boolean
  data?: LanguageTool
  error?: string
}

export interface LanguageToolListResponse {
  success: boolean
  data?: LanguageTool[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing tools
export interface LanguageToolListParams {
  namespace?: string
  labelSelector?: string
  fieldSelector?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'type' | 'phase' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
  type?: string[]
  phase?: string[]
}

// Re-export ToolSchema for consumers that previously imported it from here
export type { ToolSchema, ToolSchemaDefinition, ToolProperty } from './shared'
