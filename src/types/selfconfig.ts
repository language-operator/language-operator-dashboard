// TypeScript types for LanguageAgentSelfConfig CRD
// Mirrors language-operator/src/api/v1alpha1/languageagentselfconfig_types.go
// Namespaced resource (lives in cluster namespace)

import { V1ObjectMeta } from '@kubernetes/client-node'

export type SelfConfigPhase = 'Pending' | 'Applied' | 'Failed' | 'Denied'

export interface SelfConfigEnvVar {
  name: string
  value?: string
  valueFrom?: unknown // V1EnvVarSource — opaque to the dashboard
}

export interface PolicyRule {
  apiGroups?: string[]
  resources?: string[]
  verbs: string[]
}

export interface LanguageAgentSelfConfigSpec {
  instanceRef: string
  addTools?: string[]
  removeTools?: string[]
  addModels?: string[]
  removeModels?: string[]
  addEnvVars?: SelfConfigEnvVar[]
  updateInstructions?: string
  addRoleRules?: PolicyRule[]
}

export interface LanguageAgentSelfConfigStatus {
  phase?: SelfConfigPhase
  message?: string
  completionTime?: string // ISO string from metav1.Time JSON serialisation
}

export interface LanguageAgentSelfConfig {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgentSelfConfig'
  metadata: V1ObjectMeta
  spec: LanguageAgentSelfConfigSpec
  status?: LanguageAgentSelfConfigStatus
}

export interface LanguageAgentSelfConfigList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageAgentSelfConfigList'
  metadata: V1ObjectMeta
  items: LanguageAgentSelfConfig[]
}

export interface LanguageAgentSelfConfigListResponse {
  success: boolean
  data?: LanguageAgentSelfConfig[]
  error?: string
}
