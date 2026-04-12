// TypeScript types for LanguageAgentRuntime CRD
// Mirrors language-operator/src/api/v1alpha1/languageagentruntime_types.go
// Cluster-scoped resource (no namespace)

import { V1ObjectMeta } from '@kubernetes/client-node'
import {
  AgentPort,
  ClaudeCodeConfig,
  DeploymentSpec,
  OpenclawConfig,
  OpencodeConfig,
  WorkspaceSpec,
} from './shared'

// Runtime type inferred from which config block is present in spec
export type RuntimeType = 'claude-code' | 'opencode' | 'openclaw' | 'custom'

export function inferRuntimeType(spec: LanguageAgentRuntimeSpec): RuntimeType {
  if (spec.claudeCode) return 'claude-code'
  if (spec.opencode) return 'opencode'
  if (spec.openclaw) return 'openclaw'
  return 'custom'
}

export interface LanguageAgentRuntime {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgentRuntime'
  metadata: V1ObjectMeta
  spec: LanguageAgentRuntimeSpec
}

export interface LanguageAgentRuntimeList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgentRuntimeList'
  metadata: V1ObjectMeta
  items: LanguageAgentRuntime[]
}

export interface LanguageAgentRuntimeSpec {
  image?: string
  ports?: AgentPort[]
  workspace?: WorkspaceSpec
  deployment?: DeploymentSpec
  openclaw?: OpenclawConfig
  opencode?: OpencodeConfig
  claudeCode?: ClaudeCodeConfig
}

// Frontend form type
export interface LanguageAgentRuntimeFormData {
  name: string
  runtimeType: RuntimeType
  image?: string
  // Credential configs
  claudeCodeEnabled?: boolean
  claudeCodeApiKey?: string
  claudeCodeApiKeySecretName?: string
  claudeCodeMaxTurns?: number
  opencodeEnabled?: boolean
  opencodeUsername?: string
  opencodePassword?: string
  opencodePasswordSecretName?: string
  openclawEnabled?: boolean
  openclawToken?: string
  openclawTokenSecretName?: string
  // Workspace defaults
  workspaceSize?: string
  workspaceStorageClassName?: string
  workspaceMountPath?: string
  // Deployment defaults
  cpuRequest?: string
  cpuLimit?: string
  memoryRequest?: string
  memoryLimit?: string
}

// API response types
export interface LanguageAgentRuntimeResponse {
  success: boolean
  data?: LanguageAgentRuntime
  error?: string
}

export interface LanguageAgentRuntimeListResponse {
  success: boolean
  data?: LanguageAgentRuntime[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing runtimes
export interface LanguageAgentRuntimeListParams {
  page?: number
  limit?: number
  sortBy?: 'name' | 'type' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

// Re-export shared types that consumers may need
export type { WorkspaceSpec, DeploymentSpec, AgentPort, ClaudeCodeConfig, OpencodeConfig, OpenclawConfig } from './shared'
