import { z } from 'zod'

// Common Kubernetes metadata schema
const KubernetesMetadataSchema = z.object({
  name: z.string().min(1).max(253).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: "Name must be lowercase letters, numbers, and hyphens only (e.g., my-agent-v1). Cannot start or end with hyphen."
  }),
  namespace: z.string().min(1).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: "Namespace must be lowercase alphanumeric with hyphens"
  }),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  uid: z.string().optional(),
  resourceVersion: z.string().optional(),
  generation: z.number().optional(),
  creationTimestamp: z.string().optional(),
  deletionTimestamp: z.string().optional(),
  finalizers: z.array(z.string()).optional(),
})

// LanguageAgent validation matching the Go CRD specification
export const LanguageAgentSpecSchema = z.object({
  // Runtime preset (provides default image, ports, probes, env vars)
  runtime: z.string().optional(),

  // Container image — required unless runtime provides a default
  image: z.string().optional(),

  // Model references
  models: z.array(z.object({
    name: z.string().min(1, "Model name is required"),
    role: z.enum(['primary', 'fallback', 'reasoning', 'tool-calling', 'summarization']).optional(),
    priority: z.number().int().optional(),
  })).optional(),

  // Tool references
  tools: z.array(z.object({
    name: z.string().min(1, "Tool name is required"),
    enabled: z.boolean().optional(),
  })).optional(),

  // Persona name
  persona: z.string().optional(),

  // System instructions
  instructions: z.string().min(10).max(10000).optional(),

  // Remaining spec fields are complex Kubernetes objects; accept them loosely
  workspace: z.record(z.string(), z.unknown()).optional(),
  networkPolicies: z.record(z.string(), z.unknown()).optional(),
  ports: z.array(z.record(z.string(), z.unknown())).optional(),
  deployment: z.record(z.string(), z.unknown()).optional(),
  opencode: z.record(z.string(), z.unknown()).optional(),
  openclaw: z.record(z.string(), z.unknown()).optional(),
  claudeCode: z.record(z.string(), z.unknown()).optional(),
  selfConfigure: z.record(z.string(), z.unknown()).optional(),
  monitoring: z.record(z.string(), z.unknown()).optional(),
})

export const LanguageAgentStatusSchema = z.object({
  phase: z.enum(['Pending', 'Running', 'Failed', 'Updating', 'Degraded']).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
  activeReplicas: z.number().int().min(0).optional(),
  readyReplicas: z.number().int().min(0).optional(),
  uuid: z.string().optional(),
  webhookURLs: z.array(z.string()).optional(),
  observedGeneration: z.number().int().optional(),
  workspacePVCName: z.string().optional(),
  managedResources: z.array(z.record(z.string(), z.unknown())).optional(),
})

export const LanguageAgentSchema = z.object({
  apiVersion: z.string().default('langop.io/v1alpha1'),
  kind: z.string().default('LanguageAgent'),
  metadata: KubernetesMetadataSchema,
  spec: LanguageAgentSpecSchema,
  status: LanguageAgentStatusSchema.optional(),
})

// LanguageModel validation
export const LanguageModelSpecSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'openai-compatible', 'azure', 'bedrock', 'vertex', 'custom'], {
    message: "Provider must be one of: openai, anthropic, openai-compatible, azure, bedrock, vertex, custom"
  }),
  modelName: z.string().min(1, "Model name is required"),
  endpoint: z.string().optional(),
  apiKeySecretRef: z.object({
    name: z.string(),
    key: z.string().optional(),
  }).optional(),
  rateLimits: z.object({
    requestsPerMinute: z.number().int().min(1).max(10000).optional(),
    tokensPerMinute: z.number().int().min(1).max(1000000).optional(),
  }).optional(),
  timeout: z.string().regex(/^[0-9]+(ns|us|µs|ms|s|m|h)$/).optional(),
})

export const LanguageModelStatusSchema = z.object({
  phase: z.enum(['Pending', 'Ready', 'Failed']).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
  message: z.string().optional(),
  observedGeneration: z.number().int().optional(),
})

export const LanguageModelSchema = z.object({
  apiVersion: z.string().default('language.operator.io/v1'),
  kind: z.string().default('LanguageModel'),
  metadata: KubernetesMetadataSchema,
  spec: LanguageModelSpecSchema,
  status: LanguageModelStatusSchema.optional(),
})

// LanguageTool validation
export const LanguageToolSpecSchema = z.object({
  image: z.string().min(1, "Container image is required"),
  type: z.enum(['mcp']).optional(),
  deploymentMode: z.enum(['service', 'sidecar']).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  deployment: z.record(z.string(), z.unknown()).optional(),
  networkPolicies: z.record(z.string(), z.unknown()).optional(),
})

export const LanguageToolStatusSchema = z.object({
  phase: z.enum(['Pending', 'Running', 'Failed', 'Updating', 'Degraded']).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
  endpoint: z.string().optional(),
  toolSchemas: z.array(z.record(z.string(), z.unknown())).optional(),
  readyReplicas: z.number().int().min(0).optional(),
  availableReplicas: z.number().int().min(0).optional(),
  updatedReplicas: z.number().int().min(0).optional(),
  unavailableReplicas: z.number().int().min(0).optional(),
  observedGeneration: z.number().int().optional(),
})

export const LanguageToolSchema = z.object({
  apiVersion: z.string().default('language.operator.io/v1'),
  kind: z.string().default('LanguageTool'),
  metadata: KubernetesMetadataSchema,
  spec: LanguageToolSpecSchema,
  status: LanguageToolStatusSchema.optional(),
})

// LanguagePersona validation matching CRD spec
export const LanguagePersonaSpecSchema = z.object({
  tone: z.string().optional(),
  personality: z.string().optional(),
  expertise: z.string().optional(),
})

export const LanguagePersonaStatusSchema = z.object({
  phase: z.enum(['Pending', 'Ready', 'Failed']).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
  observedGeneration: z.number().int().optional(),
})

export const LanguagePersonaSchema = z.object({
  apiVersion: z.string().default('language.operator.io/v1'),
  kind: z.string().default('LanguagePersona'),
  metadata: KubernetesMetadataSchema,
  spec: LanguagePersonaSpecSchema,
  status: LanguagePersonaStatusSchema.optional(),
})

// LanguageCluster validation
export const LanguageClusterSpecSchema = z.object({
  domain: z.string().min(1, "Domain is required").refine((val) => {
    // Basic domain validation
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(val)
  }, "Invalid domain format"),
  subdomain: z.string().optional(),
  tls: z.object({
    enabled: z.boolean().default(true),
    autoProvision: z.boolean().default(true),
    secretName: z.string().optional(),
    issuer: z.string().optional(),
  }).optional(),
  gateway: z.object({
    className: z.string().optional(),
    loadBalancerType: z.enum(['standard', 'internal', 'external']).optional(),
    annotations: z.record(z.string(), z.string()).optional(),
    allowedOrigins: z.array(z.string()).optional(),
  }).optional(),
  scaling: z.object({
    minReplicas: z.number().int().min(0).max(100).default(1),
    maxReplicas: z.number().int().min(1).max(100).default(10),
    targetCPUUtilization: z.number().int().min(1).max(100).default(70),
    targetMemoryUtilization: z.number().int().min(1).max(100).default(80),
  }).optional(),
})

export const LanguageClusterStatusSchema = z.object({
  phase: z.enum(['Pending', 'Ready', 'Failed', 'Scaling']).optional(),
  agentCount: z.number().int().min(0).optional(),
  agents: z.array(z.object({
    name: z.string(),
    namespace: z.string(),
    status: z.enum(['Ready', 'Pending', 'Failed']),
  })).optional(),
  ingress: z.object({
    ready: z.boolean().optional(),
    endpoint: z.string().url().optional(),
    dnsRecords: z.array(z.object({
      type: z.string(),
      name: z.string(),
      value: z.string(),
    })).optional(),
  }).optional(),
  tls: z.object({
    ready: z.boolean().optional(),
    certificateExpiry: z.string().optional(),
    issuer: z.string().optional(),
  }).optional(),
  gateway: z.object({
    ready: z.boolean().optional(),
    externalIP: z.string().optional(),
    loadBalancerStatus: z.string().optional(),
  }).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    status: z.enum(['True', 'False', 'Unknown']),
    reason: z.string().optional(),
    message: z.string().optional(),
    lastTransitionTime: z.string().optional(),
  })).optional(),
  lastUpdateTime: z.string().optional(),
  message: z.string().optional(),
})

export const LanguageClusterSchema = z.object({
  apiVersion: z.string().default('language.operator.io/v1'),
  kind: z.string().default('LanguageCluster'),
  metadata: KubernetesMetadataSchema,
  spec: LanguageClusterSpecSchema,
  status: LanguageClusterStatusSchema.optional(),
})

// Export Kubernetes name validation for reuse in form schemas
export const kubernetesNameValidation = z.string()
  .min(1, 'Name is required')
  .max(253, 'Name must be 253 characters or less')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 
    'Name must be lowercase letters, numbers, and hyphens only (e.g., my-agent-v1). Cannot start or end with hyphen.'
  )

// Cluster name validation with specific error messages
export const clusterNameValidation = z.string()
  .min(1, 'Cluster name is required')
  .max(253, 'Cluster name must be 253 characters or less')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 
    'Cluster name must be lowercase letters, numbers, and hyphens only. Cannot start or end with hyphen.'
  )

// Query parameter validation schemas
export const ClusterScopedListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(100).optional(),
  clusterName: clusterNameValidation.optional(),
})

// Cluster-scoped resource creation validation
export const ClusterResourceCreateParamsSchema = z.object({
  clusterName: clusterNameValidation,
})

// Error context validation
export const ApiErrorContextSchema = z.object({
  clusterName: z.string().optional(),
  namespace: z.string().optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
  operation: z.string().optional(),
  userRole: z.string().optional(),
}).optional()

// Cluster validation schemas
export const ClusterValidationSchema = z.object({
  exists: z.boolean(),
  accessible: z.boolean(),
  phase: z.enum(['Pending', 'Ready', 'Failed', 'Scaling']).optional(),
})

// Resource filtering validation
export const ResourceFilterParamsSchema = z.object({
  clusterRef: clusterNameValidation.optional(),
  allowOrphanedResources: z.boolean().default(false),
  requireClusterRef: z.boolean().default(false),
})

// Export all schemas for easy access
export const CRDSchemas = {
  LanguageAgent: LanguageAgentSchema,
  LanguageModel: LanguageModelSchema,
  LanguageTool: LanguageToolSchema,
  LanguagePersona: LanguagePersonaSchema,
  LanguageCluster: LanguageClusterSchema,
}

// Type inference from schemas
export type LanguageAgent = z.infer<typeof LanguageAgentSchema>
export type LanguageModel = z.infer<typeof LanguageModelSchema>
export type LanguageTool = z.infer<typeof LanguageToolSchema>
export type LanguagePersona = z.infer<typeof LanguagePersonaSchema>
export type LanguageCluster = z.infer<typeof LanguageClusterSchema>

// Validation helper functions
export function validateLanguageAgent(data: unknown): LanguageAgent {
  return LanguageAgentSchema.parse(data)
}

export function validateLanguageModel(data: unknown): LanguageModel {
  return LanguageModelSchema.parse(data)
}

export function validateLanguageTool(data: unknown): LanguageTool {
  return LanguageToolSchema.parse(data)
}

export function validateLanguagePersona(data: unknown): LanguagePersona {
  return LanguagePersonaSchema.parse(data)
}

export function validateLanguageCluster(data: unknown): LanguageCluster {
  return LanguageClusterSchema.parse(data)
}

// Safe validation that returns errors instead of throwing
export function safeValidateLanguageAgent(data: unknown): { success: true; data: LanguageAgent } | { success: false; error: z.ZodError } {
  const result = LanguageAgentSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateLanguageModel(data: unknown): { success: true; data: LanguageModel } | { success: false; error: z.ZodError } {
  const result = LanguageModelSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateLanguageTool(data: unknown): { success: true; data: LanguageTool } | { success: false; error: z.ZodError } {
  const result = LanguageToolSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateLanguagePersona(data: unknown): { success: true; data: LanguagePersona } | { success: false; error: z.ZodError } {
  const result = LanguagePersonaSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateLanguageCluster(data: unknown): { success: true; data: LanguageCluster } | { success: false; error: z.ZodError } {
  const result = LanguageClusterSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

// Organization management validation schemas
export const OrganizationCreateSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
  slug: z.string()
    .min(1, "Organization slug is required")
    .max(50, "Organization slug must be less than 50 characters")
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Organization slug must be lowercase alphanumeric with hyphens"),
  namespace: z.string()
    .min(1, "Kubernetes namespace is required")
    .max(63, "Kubernetes namespace must be less than 63 characters")
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Kubernetes namespace must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
})

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
})

export const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['admin', 'member', 'viewer'], {
    message: "Role must be one of: admin, member, viewer"
  }),
  message: z.string().max(500, "Invitation message must be less than 500 characters").optional(),
})

export const AcceptInviteSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
})

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer'], {
    message: "Role must be one of: admin, member, viewer"
  }),
})

// User management validation schemas
export const UserSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
})

export const UserUpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  image: z.string().url("Invalid image URL").optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
})

// Search and filter validation schemas
export const NamespaceSearchSchema = z.object({
  q: z.string().min(1, "Search query is required").max(100, "Search query must be less than 100 characters"),
  type: z.enum(['agents', 'models', 'tools', 'personas', 'clusters', 'all']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  organization: z.string().optional(),
})

export const NamespaceStatsSchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  granularity: z.enum(['minute', 'hour', 'day']).default('hour'),
  includeDetails: z.boolean().default(false),
})

// Common list parameters validation
export const ListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(100).optional(),
})

// Export validation helper functions
export function safeValidateOrganizationCreate(data: unknown) {
  const result = OrganizationCreateSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateOrganizationUpdate(data: unknown) {
  const result = OrganizationUpdateSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateInviteMember(data: unknown) {
  const result = InviteMemberSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateAcceptInvite(data: unknown) {
  const result = AcceptInviteSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateUpdateMemberRole(data: unknown) {
  const result = UpdateMemberRoleSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateUserSignup(data: unknown) {
  const result = UserSignupSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateUserUpdateProfile(data: unknown) {
  const result = UserUpdateProfileSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateChangePassword(data: unknown) {
  const result = ChangePasswordSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateNamespaceSearch(data: unknown) {
  const result = NamespaceSearchSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateNamespaceStats(data: unknown) {
  const result = NamespaceStatsSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateListParams(data: unknown) {
  const result = ListParamsSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

// Cluster validation helper functions
export function safeValidateClusterName(data: unknown) {
  const result = clusterNameValidation.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateClusterScopedListParams(data: unknown) {
  const result = ClusterScopedListParamsSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateClusterResourceCreateParams(data: unknown) {
  const result = ClusterResourceCreateParamsSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateResourceFilterParams(data: unknown) {
  const result = ResourceFilterParamsSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function validateClusterName(clusterName: unknown): string {
  return clusterNameValidation.parse(clusterName)
}

// Type inference for new schemas
export type OrganizationCreate = z.infer<typeof OrganizationCreateSchema>
export type OrganizationUpdate = z.infer<typeof OrganizationUpdateSchema>
export type InviteMember = z.infer<typeof InviteMemberSchema>
export type AcceptInvite = z.infer<typeof AcceptInviteSchema>
export type UpdateMemberRole = z.infer<typeof UpdateMemberRoleSchema>
export type UserSignup = z.infer<typeof UserSignupSchema>
export type UserUpdateProfile = z.infer<typeof UserUpdateProfileSchema>
export type ChangePassword = z.infer<typeof ChangePasswordSchema>
export type NamespaceSearch = z.infer<typeof NamespaceSearchSchema>
export type NamespaceStats = z.infer<typeof NamespaceStatsSchema>
export type ListParams = z.infer<typeof ListParamsSchema>

// New validation types
export type ClusterScopedListParams = z.infer<typeof ClusterScopedListParamsSchema>
export type ClusterResourceCreateParams = z.infer<typeof ClusterResourceCreateParamsSchema>
export type ResourceFilterParams = z.infer<typeof ResourceFilterParamsSchema>
export type ClusterValidation = z.infer<typeof ClusterValidationSchema>
export type ApiErrorContext = z.infer<typeof ApiErrorContextSchema>

// Resource quota validation schemas
export const QuotaSchema = z.object({
  'count/languageagents': z.string().regex(/^\d+$/, 'Must be a positive integer'),
  'count/languagemodels': z.string().regex(/^\d+$/, 'Must be a positive integer'),
  'count/languagetools': z.string().regex(/^\d+$/, 'Must be a positive integer'),
  'count/languagepersonas': z.string().regex(/^\d+$/, 'Must be a positive integer'),
  'count/languageclusters': z.string().regex(/^\d+$/, 'Must be a positive integer'),
  'requests.cpu': z.string().regex(/^\d+(m)?$/, 'Must be in format: 100m or 1 (cores)'),
  'requests.memory': z.string().regex(/^\d+(Ki|Mi|Gi)$/, 'Must be in format: 128Mi, 2Gi, or 1024Ki'),
  'limits.cpu': z.string().regex(/^\d+(m)?$/, 'Must be in format: 100m or 1 (cores)'),
  'limits.memory': z.string().regex(/^\d+(Ki|Mi|Gi)$/, 'Must be in format: 128Mi, 2Gi, or 1024Ki'),
})

export const QuotaUpdateSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  quotas: QuotaSchema.optional()
}).refine(data => data.plan || data.quotas, {
  message: 'Either plan or quotas must be provided'
})

export type Quota = z.infer<typeof QuotaSchema>
export type QuotaUpdate = z.infer<typeof QuotaUpdateSchema>

// Quota validation helper functions
export function safeValidateQuota(data: unknown) {
  const result = QuotaSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}

export function safeValidateQuotaUpdate(data: unknown) {
  const result = QuotaUpdateSchema.safeParse(data)
  return result.success ? { success: true, data: result.data } : { success: false, error: result.error }
}