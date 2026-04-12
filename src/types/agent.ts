// TypeScript types for LanguageAgent CRD
// Mirrors language-operator/src/api/v1alpha1/languageagent_types.go

import { V1Condition, V1ObjectMeta } from '@kubernetes/client-node'
import {
  AgentMonitoringSpec,
  AgentNetworkPolicies,
  AgentPort,
  ClaudeCodeConfig,
  DeploymentSpec,
  ManagedResource,
  ModelReference,
  OpenclawConfig,
  OpencodeConfig,
  SelfConfigureSpec,
  ToolReference,
  WorkspaceSpec,
} from './shared'

// LanguageAgent CRD Types
export interface LanguageAgent {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgent'
  metadata: V1ObjectMeta
  spec: LanguageAgentSpec
  status?: LanguageAgentStatus
}

export interface LanguageAgentList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgentList'
  metadata: V1ObjectMeta
  items: LanguageAgent[]
}

export interface LanguageAgentSpec {
  // Runtime preset (provides default image, ports, probes, env vars)
  runtime?: string

  // Container image — required unless runtime provides a default
  image?: string

  // Model references
  models?: ModelReference[]

  // Tool references
  tools?: ToolReference[]

  // Persona name (references a LanguagePersona in the same namespace)
  persona?: string

  // System instructions for the agent
  instructions?: string

  // Persistent workspace storage
  workspace?: WorkspaceSpec

  // Network policy rules
  networkPolicies?: AgentNetworkPolicies

  // Exposed container ports
  ports?: AgentPort[]

  // Kubernetes deployment configuration
  deployment?: DeploymentSpec

  // Runtime-specific configs (only effective when matching runtime is set)
  opencode?: OpencodeConfig
  openclaw?: OpenclawConfig
  claudeCode?: ClaudeCodeConfig

  // Runtime self-configuration permissions
  selfConfigure?: SelfConfigureSpec

  // Prometheus Operator integration
  monitoring?: AgentMonitoringSpec
}

export interface LanguageAgentStatus {
  phase?: 'Pending' | 'Running' | 'Failed' | 'Updating' | 'Degraded'
  conditions?: V1Condition[]
  activeReplicas?: number
  readyReplicas?: number
  uuid?: string
  webhookURLs?: string[]
  observedGeneration?: number
  workspacePVCName?: string
  managedResources?: ManagedResource[]
}

// Frontend-specific form type
export interface LanguageAgentFormData {
  name: string
  namespace: string
  instructions?: string
  selectedModels?: string[]
  selectedTools?: string[]
  selectedPersona?: string
  runtime?: string
  workspaceRetain?: boolean
  selfConfigure?: {
    enabled?: boolean
    allowedActions?: Array<'tools' | 'models' | 'envVars' | 'instructions' | 'roleRules'>
  }
}

export interface LanguageAgentListItem {
  name: string
  namespace: string
  phase: string
  replicas?: number
  age: string
  creationTimestamp: string
}

// API response types
export interface LanguageAgentResponse {
  success: boolean
  data?: LanguageAgent
  error?: string
}

export interface LanguageAgentListResponse {
  success: boolean
  data?: LanguageAgent[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing agents
export interface LanguageAgentListParams {
  namespace?: string
  labelSelector?: string
  fieldSelector?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'namespace' | 'phase' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
  phase?: string[]
}

// Re-export shared types that consumers may need
export type { ModelReference, ToolReference, WorkspaceSpec, DeploymentSpec, AgentNetworkPolicies } from './shared'
