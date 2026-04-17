import * as k8s from '@kubernetes/client-node'
import { existsSync } from 'fs'
import { extractK8sStatusCode } from '@/lib/api-error-handler'
import type { LanguageAgent } from '@/types/agent'
import type { LanguageModel } from '@/types/model'
import type { LanguageTool } from '@/types/tool'
import type { LanguagePersona } from '@/types/persona'
import type { LanguageCluster } from '@/types/cluster'
import type { LanguageAgentRuntime } from '@/types/runtime'

interface RequestOptions {
  timeout?: number
  signal?: AbortSignal
}

class KubernetesClient {
  private static instance: KubernetesClient
  private kc: k8s.KubeConfig
  private coreV1Api: k8s.CoreV1Api | null
  private customObjectsApi: k8s.CustomObjectsApi | null
  private batchV1Api: k8s.BatchV1Api | null
  private rbacV1Api: k8s.RbacAuthorizationV1Api | null
  private DEFAULT_TIMEOUT = 10000 // 10 seconds

  private constructor() {
    this.kc = new k8s.KubeConfig()
    this.coreV1Api = null
    this.customObjectsApi = null
    this.batchV1Api = null
    this.rbacV1Api = null

    try {
      // Load config based on environment
      if (process.env.KUBERNETES_SERVER_URL && process.env.KUBERNETES_TOKEN) {
        // Environment variable configuration with token
        const cluster = {
          name: 'env-cluster',
          server: process.env.KUBERNETES_SERVER_URL,
          skipTLSVerify: process.env.KUBERNETES_SKIP_TLS_VERIFY === 'true',
        }
        const user = {
          name: 'env-user',
          token: process.env.KUBERNETES_TOKEN,
        }
        const context = {
          name: 'env-context',
          user: user.name,
          cluster: cluster.name,
        }
        this.kc.loadFromOptions({
          clusters: [cluster],
          users: [user],
          contexts: [context],
          currentContext: context.name,
        })
      } else if (process.env.KUBERNETES_SERVER_URL && process.env.KUBERNETES_SERVER_URL.includes('kubectl-proxy')) {
        // Docker Compose mode: use kubectl proxy (no token needed)
        const cluster = {
          name: 'kubectl-proxy-cluster',
          server: process.env.KUBERNETES_SERVER_URL,
          skipTLSVerify: true, // kubectl proxy doesn't use TLS
        }
        const user = {
          name: 'kubectl-proxy-user',
          // No token needed for kubectl proxy
        }
        const context = {
          name: 'kubectl-proxy-context',
          user: user.name,
          cluster: cluster.name,
        }
        this.kc.loadFromOptions({
          clusters: [cluster],
          users: [user],
          contexts: [context],
          currentContext: context.name,
        })
      } else if (process.env.NODE_ENV === 'development' &&
                 !existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')) {
        // Local development: use ~/.kube/config (only when not running in a pod)
        this.kc.loadFromDefault()
      } else {
        // Production: use in-cluster service account
        this.kc.loadFromCluster()
      }

      this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api)
      this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi)
      this.batchV1Api = this.kc.makeApiClient(k8s.BatchV1Api)
      this.rbacV1Api = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api)
    } catch (error) {
      console.error('❌ Failed to configure Kubernetes client:', error instanceof Error ? error.message : String(error))
      console.error('❌ Full error details:', error)
      console.error('❌ Environment variables:')
      console.error('  KUBERNETES_SERVER_URL:', process.env.KUBERNETES_SERVER_URL)
      console.error('  KUBERNETES_TOKEN:', process.env.KUBERNETES_TOKEN ? '***SET***' : 'NOT_SET')
      console.error('  NODE_ENV:', process.env.NODE_ENV)
      console.error('  KUBECONFIG:', process.env.KUBECONFIG)
      throw new Error('Kubernetes configuration is required')
    }
  }

  public static getInstance(): KubernetesClient {
    if (!KubernetesClient.instance) {
      KubernetesClient.instance = new KubernetesClient()
    }
    return KubernetesClient.instance
  }

  /**
   * Return a new client that authenticates directly with the given bearer token.
   * K8s RBAC is evaluated as the token's own identity — no impersonation.
   */
  public forToken(token: string): KubernetesClient {
    const derived = Object.create(KubernetesClient.prototype) as KubernetesClient
    const kc = new k8s.KubeConfig()
    kc.loadFromOptions({
      clusters: this.kc.getClusters(),
      users: [{ name: 'user-token', token }],
      contexts: [{
        name: 'token-context',
        user: 'user-token',
        cluster: this.kc.getClusters()[0].name,
      }],
      currentContext: 'token-context',
    })
    derived.kc = kc
    derived.coreV1Api = kc.makeApiClient(k8s.CoreV1Api)
    derived.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
    derived.batchV1Api = kc.makeApiClient(k8s.BatchV1Api)
    derived.rbacV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api)
    derived.DEFAULT_TIMEOUT = this.DEFAULT_TIMEOUT
    return derived
  }

  /**
   * Validate a bearer token by calling SelfSubjectReview against the K8s API.
   * Returns the K8s username associated with the token.
   * Throws 'Invalid or expired token' if the token is rejected.
   */
  public async validateToken(token: string): Promise<string> {
    const kc = new k8s.KubeConfig()
    kc.loadFromOptions({
      clusters: this.kc.getClusters(),
      users: [{ name: 'user-token', token }],
      contexts: [{
        name: 'token-context',
        user: 'user-token',
        cluster: this.kc.getClusters()[0].name,
      }],
      currentContext: 'token-context',
    })
    const authApi = kc.makeApiClient(k8s.AuthenticationV1Api)

    try {
      const response = await authApi.createSelfSubjectReview({
        body: {
          apiVersion: 'authentication.k8s.io/v1',
          kind: 'SelfSubjectReview',
        },
      })
      const r = response as { body?: k8s.V1SelfSubjectReview; data?: k8s.V1SelfSubjectReview } | k8s.V1SelfSubjectReview
      const review = (r as { body?: k8s.V1SelfSubjectReview }).body
        ?? (r as { data?: k8s.V1SelfSubjectReview }).data
        ?? (r as k8s.V1SelfSubjectReview)
      const username = review?.status?.userInfo?.username
      if (!username) throw new Error('Could not determine user identity from token')
      return username
    } catch (error) {
      const statusCode = extractK8sStatusCode(error)
      if (statusCode === 401 || statusCode === 403) {
        throw new Error('Invalid or expired token')
      }
      throw error
    }
  }

  /**
   * Wrap Kubernetes API calls with timeout and cancellation support
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT
    
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(
          () => reject(new Error(`Operation timed out after ${timeout}ms`)),
          timeout
        )
        
        // Cancel timeout if request is aborted
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            reject(new Error('Request was cancelled'))
          })
        }
      })
    ])
  }


  // Core V1 API methods

  async listNamespaces() {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.listNamespace({})
  }

  async getNamespace(name: string) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.readNamespace({ name })
  }

  async createNamespace(name: string, labels?: Record<string, string>) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    const namespace: k8s.V1Namespace = {
      metadata: {
        name,
        labels,
      },
    }
    return await this.coreV1Api.createNamespace({ body: namespace })
  }

  async getPodLogs(namespace: string, podName: string, options?: {
    tailLines?: number
    timestamps?: boolean
    sinceSeconds?: number
    container?: string
    previous?: boolean
  }) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.readNamespacedPodLog({
      name: podName,
      namespace,
      tailLines: options?.tailLines || 100,
      timestamps: options?.timestamps || false,
      sinceSeconds: options?.sinceSeconds,
      container: options?.container,
      previous: options?.previous,
    })
  }

  async listPods(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
  }) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.listNamespacedPod({
      namespace,
      labelSelector: options?.labelSelector,
      fieldSelector: options?.fieldSelector,
      limit: options?.limit,
    })
  }

  async streamPodLogs(namespace: string, podName: string, options?: {
    follow?: boolean
    tailLines?: number
    timestamps?: boolean
  }) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    
    // Use the log method that returns a stream
    return await this.coreV1Api.readNamespacedPodLog({
      name: podName,
      namespace,
      follow: options?.follow || false,
      tailLines: options?.tailLines || 10,
      timestamps: options?.timestamps || false,
    })
  }


  private parseResourceQuantity(quantity: string): number {
    // Simple parser for basic quantities
    if (quantity.endsWith('m')) {
      return parseInt(quantity.slice(0, -1))
    }
    if (quantity.endsWith('Gi')) {
      return parseInt(quantity.slice(0, -2)) * 1024 * 1024 * 1024
    }
    if (quantity.endsWith('Mi')) {
      return parseInt(quantity.slice(0, -2)) * 1024 * 1024
    }
    if (quantity.endsWith('Ki')) {
      return parseInt(quantity.slice(0, -2)) * 1024
    }
    return parseInt(quantity) || 0
  }

  // Custom Resource methods for language-operator CRDs

  async listLanguageAgents(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
    continue?: string
  }, requestOptions: RequestOptions = {}) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.withTimeout(
      () => this.customObjectsApi!.listNamespacedCustomObject({
        group: 'langop.io',
        version: 'v1alpha1',
        namespace,
        plural: 'languageagents',
        ...options,
      }),
      requestOptions
    )
  }

  async getLanguageAgent(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagents',
      name,
    })
  }

  async createLanguageAgent(namespace: string, spec: LanguageAgent) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagents',
      body: spec,
    })
  }

  async updateLanguageAgent(namespace: string, name: string, spec: LanguageAgent) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    // Use replaceNamespacedCustomObject instead of patch to avoid patch format issues
    return await this.customObjectsApi.replaceNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagents',
      name,
      body: spec,
    })
  }

  async deleteLanguageAgent(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagents',
      name,
    })
  }

  // LanguageModel methods

  async listLanguageModels(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
    continue?: string
  }, requestOptions: RequestOptions = {}) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.withTimeout(
      () => this.customObjectsApi!.listNamespacedCustomObject({
        group: 'langop.io',
        version: 'v1alpha1',
        namespace,
        plural: 'languagemodels',
        ...options,
      }),
      requestOptions
    )
  }

  async getLanguageModel(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagemodels',
      name,
    })
  }

  async createLanguageModel(namespace: string, spec: LanguageModel) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagemodels',
      body: spec,
    })
  }

  async updateLanguageModel(namespace: string, name: string, spec: LanguageModel) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    // Create a merge patch for the spec field only (CRDs don't support strategic merge)
    const patch = {
      spec: spec.spec
    }
    
    return await this.customObjectsApi.patchNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagemodels',
      name,
      body: patch,
    })
  }

  async replaceLanguageModel(namespace: string, name: string, model: LanguageModel) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }

    // LanguageModel already has kind and apiVersion as required literal fields
    return await this.customObjectsApi.replaceNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagemodels',
      name,
      body: model,
    })
  }

  async deleteLanguageModel(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagemodels',
      name,
    })
  }

  // LanguageTool methods

  async listLanguageTools(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
    continue?: string
  }, requestOptions: RequestOptions = {}) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.withTimeout(
      () => this.customObjectsApi!.listNamespacedCustomObject({
        group: 'langop.io',
        version: 'v1alpha1',
        namespace,
        plural: 'languagetools',
        ...options,
      }),
      requestOptions
    )
  }

  async getLanguageTool(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagetools',
      name,
    })
  }

  async createLanguageTool(namespace: string, spec: LanguageTool) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagetools',
      body: spec,
    })
  }

  async updateLanguageTool(namespace: string, name: string, spec: LanguageTool) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.patchNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagetools',
      name,
      body: spec,
    })
  }

  async replaceLanguageTool(namespace: string, name: string, tool: LanguageTool) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.replaceNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagetools',
      name,
      body: tool,
    })
  }

  async deleteLanguageTool(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagetools',
      name,
    })
  }

  // LanguagePersona methods

  async listLanguagePersonas(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
    continue?: string
  }, requestOptions: RequestOptions = {}) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.withTimeout(
      () => this.customObjectsApi!.listNamespacedCustomObject({
        group: 'langop.io',
        version: 'v1alpha1',
        namespace,
        plural: 'languagepersonas',
        ...options,
      }),
      requestOptions
    )
  }

  async getLanguagePersona(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagepersonas',
      name,
    })
  }

  async createLanguagePersona(namespace: string, spec: LanguagePersona) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagepersonas',
      body: spec,
    })
  }

  async updateLanguagePersona(namespace: string, name: string, persona: LanguagePersona) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    // LanguagePersona already has kind and apiVersion as required literal fields
    return await this.customObjectsApi.replaceNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagepersonas',
      name,
      body: persona,
    })
  }

  async deleteLanguagePersona(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languagepersonas',
      name,
    })
  }

  // LanguageCluster methods

  // LanguageCluster is cluster-scoped (not namespaced) — use cluster-level API methods.
  // The namespace parameter is kept for API compatibility but used only as a label filter.

  async listLanguageClusters(namespace: string, options?: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
    continue?: string
  }) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }

    return await this.customObjectsApi.listClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageclusters',
      ...options,
    })
  }

  async getLanguageCluster(namespace: string, name: string, options: RequestOptions = {}) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.withTimeout(
      () => this.customObjectsApi!.getClusterCustomObject({
        group: 'langop.io',
        version: 'v1alpha1',
        plural: 'languageclusters',
        name,
      }),
      options
    )
  }

  async createLanguageCluster(namespace: string, spec: LanguageCluster) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageclusters',
      body: spec,
    })
  }

  async updateLanguageCluster(namespace: string, name: string, updatedResource: LanguageCluster) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }

    // LanguageCluster already has kind and apiVersion as required literal fields
    return await this.customObjectsApi.replaceClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageclusters',
      name,
      body: updatedResource,
    })
  }

  async deleteLanguageCluster(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageclusters',
      name,
    })
  }

  // LanguageAgentRuntime methods (cluster-scoped)

  async listLanguageAgentRuntimes() {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.listClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageagentruntimes',
    })
  }

  async getLanguageAgentRuntime(name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageagentruntimes',
      name,
    })
  }

  async createLanguageAgentRuntime(spec: LanguageAgentRuntime) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageagentruntimes',
      body: spec,
    })
  }

  async updateLanguageAgentRuntime(name: string, updatedResource: LanguageAgentRuntime) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    // LanguageAgentRuntime already has kind and apiVersion as required literal fields
    return await this.customObjectsApi.replaceClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageagentruntimes',
      name,
      body: updatedResource,
    })
  }

  async deleteLanguageAgentRuntime(name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteClusterCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      plural: 'languageagentruntimes',
      name,
    })
  }

  // LanguageAgentSelfConfig methods (namespace-scoped)

  async listLanguageAgentSelfConfigs(namespace: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.listNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentselfconfigs',
    })
  }

  async getLanguageAgentSelfConfig(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentselfconfigs',
      name,
    })
  }

  // LanguageAgentVersion methods

  async listLanguageAgentVersions(namespace: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.customObjectsApi.listNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentversions',
    })
  }

  async getLanguageAgentVersion(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.getNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentversions',
      name,
    })
  }

  async createLanguageAgentVersion(namespace: string, spec: Record<string, unknown>) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.createNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentversions',
      body: spec,
    })
  }

  async updateLanguageAgentVersion(namespace: string, name: string, spec: Record<string, unknown>) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.patchNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentversions',
      name,
      body: spec,
    })
  }

  async deleteLanguageAgentVersion(namespace: string, name: string) {
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes API not available')
    }
    return await this.customObjectsApi.deleteNamespacedCustomObject({
      group: 'langop.io',
      version: 'v1alpha1',
      namespace,
      plural: 'languageagentversions',
      name,
    })
  }

  // Events API
  async listEvents(namespace: string, options: {
    labelSelector?: string
    fieldSelector?: string
    limit?: number
  } = {}) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    
    return await this.coreV1Api.listNamespacedEvent({
      namespace,
      labelSelector: options.labelSelector,
      fieldSelector: options.fieldSelector,
      limit: options.limit || 50, // Default to last 50 events
    })
  }

  // ConfigMap API methods
  async readConfigMap(namespace: string, name: string) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.readNamespacedConfigMap({
      name,
      namespace
    })
  }

  async createConfigMap(namespace: string, configMap: k8s.V1ConfigMap) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.createNamespacedConfigMap({
      namespace,
      body: configMap
    })
  }

  async replaceConfigMap(namespace: string, name: string, configMap: k8s.V1ConfigMap) {
    if (!this.coreV1Api) {
      throw new Error('Kubernetes API not available')
    }
    return await this.coreV1Api.replaceNamespacedConfigMap({
      name,
      namespace,
      body: configMap
    })
  }

  // RBAC methods

  async listRoleBindings(namespace: string) {
    if (!this.rbacV1Api) throw new Error('RBAC API not available')
    return this.rbacV1Api.listNamespacedRoleBinding({ namespace })
  }

  async createRoleBinding(namespace: string, binding: k8s.V1RoleBinding) {
    if (!this.rbacV1Api) throw new Error('RBAC API not available')
    return this.rbacV1Api.createNamespacedRoleBinding({ namespace, body: binding })
  }

  async deleteRoleBinding(namespace: string, name: string) {
    if (!this.rbacV1Api) throw new Error('RBAC API not available')
    return this.rbacV1Api.deleteNamespacedRoleBinding({ namespace, name })
  }

  // Jobs management
  async createJob(namespace: string, job: k8s.V1Job) {
    if (!this.batchV1Api) {
      throw new Error('Kubernetes client not initialized')
    }

    try {
      const response = await this.batchV1Api.createNamespacedJob({
        namespace,
        body: job,
      })
      console.log(`✅ Job created successfully: ${job.metadata?.name}`)
      return response
    } catch (error) {
      console.error(`❌ Failed to create Job ${job.metadata?.name}:`, error)
      throw error
    }
  }

  async getCronJob(namespace: string, name: string) {
    if (!this.batchV1Api) {
      throw new Error('Kubernetes client not initialized')
    }

    try {
      const response = await this.batchV1Api.readNamespacedCronJob({
        name,
        namespace,
      })
      return response
    } catch (error) {
      console.error(`❌ Failed to get CronJob ${name}:`, error)
      throw error
    }
  }

  async createJobFromCronJob(namespace: string, cronJobName: string, jobName: string) {
    if (!this.batchV1Api) {
      throw new Error('Kubernetes client not initialized')
    }

    try {
      // Get the existing CronJob
      const cronJobResponse = await this.getCronJob(namespace, cronJobName)
      const r = cronJobResponse as { body?: k8s.V1CronJob; data?: k8s.V1CronJob } | k8s.V1CronJob
      const cronJob = (r as { body?: k8s.V1CronJob }).body ?? (r as { data?: k8s.V1CronJob }).data ?? (r as k8s.V1CronJob)
      
      if (!cronJob?.spec?.jobTemplate) {
        throw new Error(`CronJob ${cronJobName} does not have a valid job template`)
      }

      // Extract the job template and create a new Job
      const jobTemplate = cronJob.spec.jobTemplate
      const job = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          name: jobName,
          namespace,
          labels: {
            ...(jobTemplate.metadata?.labels || {}),
            'langop.io/execution-type': 'manual'
          },
          annotations: {
            ...(jobTemplate.metadata?.annotations || {}),
            'langop.io/manual-execution': 'true',
            'langop.io/created-from-cronjob': cronJobName
          }
        },
        spec: jobTemplate.spec
      }

      const response = await this.batchV1Api.createNamespacedJob({
        namespace,
        body: job,
      })
      console.log(`✅ Job created from CronJob: ${jobName} (from ${cronJobName})`)
      return response
    } catch (error) {
      console.error(`❌ Failed to create Job from CronJob ${cronJobName}:`, error)
      throw error
    }
  }

  async getJob(namespace: string, name: string) {
    if (!this.batchV1Api) {
      throw new Error('Kubernetes client not initialized')
    }

    try {
      const response = await this.batchV1Api.readNamespacedJob({
        namespace,
        name,
      })
      return response
    } catch (error) {
      console.error(`❌ Failed to get Job ${name}:`, error)
      throw error
    }
  }

  async listJobs(namespace: string, options?: { labelSelector?: string }) {
    if (!this.batchV1Api) {
      throw new Error('Kubernetes client not initialized')
    }

    try {
      const response = await this.batchV1Api.listNamespacedJob({
        namespace,
        ...(options?.labelSelector && { labelSelector: options.labelSelector }),
      })
      return response
    } catch (error) {
      console.error(`❌ Failed to list Jobs in namespace ${namespace}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const k8sClient = KubernetesClient.getInstance()

/** Extract a list from any k8s client response shape (body.items / data.items / items). */
export function extractItems<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>
  return (
    ((r?.body as Record<string, unknown>)?.items as T[]) ??
    ((r?.data as Record<string, unknown>)?.items as T[]) ??
    (r?.items as T[]) ??
    []
  )
}

/** Extract a single resource from any k8s client response shape (body / data / direct). */
export function extractItem<T>(response: unknown): T | null {
  const r = response as Record<string, unknown>
  if (r?.body) return r.body as T
  if (r?.data) return r.data as T
  if (r) return r as T
  return null
}
