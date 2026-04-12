// Shared CRD types used across LanguageAgent, LanguageTool, and LanguageCluster
// Mirrors language-operator/src/api/v1alpha1/languagecluster_types.go and
// language-operator/src/api/v1alpha1/languageagent_types.go

import {
  V1Affinity,
  V1Container,
  V1EnvFromSource,
  V1EnvVar,
  V1LabelSelector,
  V1Probe,
  V1ResourceRequirements,
  V1Toleration,
  V1TopologySpreadConstraint,
  V1Volume,
  V1VolumeMount,
} from '@kubernetes/client-node'

// ──────────────────────────────────────────────────────────
// Network types (from AgentNetworkPolicies in cluster_types.go)
// ──────────────────────────────────────────────────────────

export interface NetworkPort {
  protocol?: 'TCP' | 'UDP' | 'SCTP'
  port: number
}

export interface ServiceReference {
  name: string
  namespace?: string
}

export interface NetworkPeer {
  group?: string
  cidr?: string
  dns?: string[]
  service?: ServiceReference
  namespaceSelector?: V1LabelSelector
  podSelector?: V1LabelSelector
}

export interface NetworkIngressRule {
  from?: NetworkPeer[]
  ports?: NetworkPort[]
}

export interface NetworkEgressRule {
  to?: NetworkPeer[]
  ports?: NetworkPort[]
}

export interface AgentNetworkPolicies {
  ingress?: NetworkIngressRule[]
  egress?: NetworkEgressRule[]
}

// ──────────────────────────────────────────────────────────
// Deployment types (from DeploymentSpec in cluster_types.go)
// ──────────────────────────────────────────────────────────

export interface AutoscalingSpec {
  minReplicas?: number
  maxReplicas: number
  metrics?: unknown[]  // autoscalingv2.MetricSpec — use unknown for now
}

export interface DeploymentSpec {
  replicas?: number
  imagePullPolicy?: 'Always' | 'Never' | 'IfNotPresent'
  imagePullSecrets?: Array<{ name: string }>
  env?: V1EnvVar[]
  envFrom?: V1EnvFromSource[]
  resources?: V1ResourceRequirements
  nodeSelector?: Record<string, string>
  affinity?: V1Affinity
  tolerations?: V1Toleration[]
  topologySpreadConstraints?: V1TopologySpreadConstraint[]
  serviceAccountName?: string
  serviceAccountAnnotations?: Record<string, string>
  roleRules?: unknown[]  // rbacv1.PolicyRule
  securityContext?: unknown  // V1PodSecurityContext
  volumeMounts?: V1VolumeMount[]
  volumes?: V1Volume[]
  podAnnotations?: Record<string, string>
  podLabels?: Record<string, string>
  initContainers?: V1Container[]
  livenessProbe?: V1Probe
  readinessProbe?: V1Probe
  startupProbe?: V1Probe
  command?: string[]
  args?: string[]
  serviceType?: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  serviceAnnotations?: Record<string, string>
  autoscaling?: AutoscalingSpec
}

// ──────────────────────────────────────────────────────────
// Agent-specific types (from languageagent_types.go)
// ──────────────────────────────────────────────────────────

export interface AgentPort {
  name: string
  port: number
  protocol?: 'TCP' | 'UDP' | 'SCTP'
  expose?: boolean
}

export interface WorkspaceSpec {
  enabled?: boolean
  size?: string
  storageClassName?: string
  accessMode?: 'ReadWriteOnce' | 'ReadWriteMany'
  mountPath?: string
  retain?: boolean
  initialFiles?: Record<string, string>
  seedConfigMapRef?: { name: string }
}

export interface ModelReference {
  name: string
  role?: 'primary' | 'fallback' | 'reasoning' | 'tool-calling' | 'summarization'
  priority?: number
}

export interface ToolReference {
  name: string
  enabled?: boolean
}

export interface RuntimeSecretRef {
  name: string
}

export interface OpencodeConfig {
  enabled?: boolean
  username?: string
  password?: string
  passwordRef?: RuntimeSecretRef
}

export interface OpenclawConfig {
  enabled?: boolean
  token?: string
  tokenRef?: RuntimeSecretRef
}

export interface ClaudeCodeConfig {
  enabled?: boolean
  apiKey?: string
  apiKeyRef?: RuntimeSecretRef
  maxTurns?: number
}

export interface SelfConfigureSpec {
  enabled?: boolean
  allowedActions?: Array<'tools' | 'models' | 'envVars' | 'instructions' | 'roleRules'>
}

export interface AgentServiceMonitorSpec {
  enabled: boolean
  port?: string
  path?: string
  interval?: string
  scrapeTimeout?: string
  labels?: Record<string, string>
}

export interface PrometheusAlertingRule {
  alert?: string
  record?: string
  expr: string
  for?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface PrometheusRuleGroup {
  name: string
  interval?: string
  rules: PrometheusAlertingRule[]
}

export interface AgentMonitoringSpec {
  serviceMonitor?: AgentServiceMonitorSpec
  rules?: PrometheusRuleGroup[]
}

// ──────────────────────────────────────────────────────────
// Tool schema types (from languagetool_types.go)
// ──────────────────────────────────────────────────────────

export interface ToolProperty {
  type: string
  description?: string
  example?: string
}

export interface ToolSchemaDefinition {
  type?: string
  properties?: Record<string, ToolProperty>
  required?: string[]
}

export interface ToolSchema {
  name: string
  description?: string
  inputSchema?: ToolSchemaDefinition
}

// ──────────────────────────────────────────────────────────
// Managed resource type (from managed_resource_types.go)
// ──────────────────────────────────────────────────────────

export interface ManagedResource {
  group?: string
  kind: string
  name: string
  namespace?: string
}
