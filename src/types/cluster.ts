// Generated TypeScript types for LanguageCluster CRD

import { V1ObjectMeta, V1Condition, V1LabelSelector } from '@kubernetes/client-node'

// LanguageCluster CRD Types
export interface LanguageCluster {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageCluster'
  metadata: V1ObjectMeta
  spec: LanguageClusterSpec
  status?: LanguageClusterStatus
}

export interface LanguageClusterList {
  apiVersion: 'langop.io/v1alpha1'
  kind: 'LanguageClusterList'
  metadata: V1ObjectMeta
  items: LanguageCluster[]
}

export interface ClusterCapacitySpec {
  maxAgents?: number
  maxModels?: number
  maxTools?: number
  maxPersonas?: number
  maxCPU?: string    // k8s quantity, e.g. "4" or "2500m"
  maxMemory?: string // k8s quantity, e.g. "8Gi"
}

export interface ClusterCapacityStatus {
  agentCount: number
  modelCount: number
  toolCount: number
  personaCount: number
  totalCPULimits?: string    // k8s quantity
  totalMemoryLimits?: string // k8s quantity
}

export interface LanguageClusterSpec {
  // Domain configuration
  domain?: string

  // Ingress/Gateway configuration
  ingressConfig?: IngressConfig

  // Network policy configuration
  networkPolicies?: NetworkRule[]

  // Shared proxy configuration
  proxy?: ProxyConfig

  // Capacity limits enforced via ResourceQuota
  capacity?: ClusterCapacitySpec
}

export interface ProxyConfig {
  ingressEnabled?: boolean
  replicas?: number
  resources?: {
    requests?: { cpu?: string; memory?: string }
    limits?: { cpu?: string; memory?: string }
  }
}

// Network rule types for cluster-level policies
export interface NetworkRule {
  description?: string
  to?: NetworkPeer
  ports?: NetworkPort[]
}

export interface NetworkPeer {
  group?: string
  cidr?: string
  dns?: string[]
  service?: ServiceReference
  namespaceSelector?: V1LabelSelector
  podSelector?: V1LabelSelector
}

export interface NetworkPort {
  protocol?: 'TCP' | 'UDP' | 'SCTP'
  port: number
}

export interface ServiceReference {
  name: string
  namespace?: string
}

export interface IngressConfig {
  // Gateway API configuration
  gatewayName?: string
  gatewayNamespace?: string
  gatewayClassName?: string // Deprecated, use gatewayName
  
  // Ingress fallback configuration
  ingressClassName?: string
  
  // TLS configuration
  tls?: TLSConfig
}

export interface TLSConfig {
  enabled?: boolean
  secretName?: string
  issuerRef?: IssuerReference
}

export interface IssuerReference {
  name: string
  kind?: 'Issuer' | 'ClusterIssuer'
  group?: string
}

// Status types
export interface LanguageClusterStatus {
  phase?: 'Pending' | 'Ready' | 'Failed' | 'Unknown'
  conditions?: V1Condition[]
  proxyEndpoint?: string
  proxyReady?: boolean
  ingress?: {
    ready?: boolean
    dnsRecords?: unknown[]
    [key: string]: unknown
  }
  agents?: unknown[]
  agentCount?: number
  capacity?: ClusterCapacityStatus
  [key: string]: unknown
}

// Frontend-specific types
export interface LanguageClusterFormData {
  name: string
  namespace: string
  
  // Domain configuration
  domain?: string
  
  // Gateway configuration
  gatewayName?: string
  gatewayNamespace?: string
  ingressClassName?: string
  
  // TLS configuration
  enableTLS?: boolean
  tlsSecretName?: string
  
  // Cert-manager configuration
  useCertManager?: boolean
  issuerName?: string
  issuerKind?: 'Issuer' | 'ClusterIssuer'
  issuerGroup?: string
  
  // Network policy fields (egress only for clusters)
  egressRules?: Array<{
    description?: string
    dns?: string[]
    cidr?: string
    ports?: Array<{
      port: number
      protocol: 'TCP' | 'UDP'
    }>
  }>
}

export interface LanguageClusterListItem {
  name: string
  namespace: string
  domain?: string
  phase?: string
  age: string
  creationTimestamp: string
}

// API response types
export interface LanguageClusterResponse {
  success: boolean
  data?: LanguageCluster
  error?: string
}

export interface LanguageClusterListResponse {
  success: boolean
  data?: LanguageCluster[]
  error?: string
  total?: number
  page?: number
  limit?: number
}

// Query parameters for listing clusters
export interface LanguageClusterListParams {
  namespace?: string
  labelSelector?: string
  fieldSelector?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'domain' | 'phase' | 'age' | 'agents' | 'status'
  sortOrder?: 'asc' | 'desc'
  search?: string
  phase?: string[]
  domain?: string
}