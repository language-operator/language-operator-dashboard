/**
 * API Client
 *
 * Simple fetch wrappers used by hooks and components.
 * Organization context was removed in the K8s RBAC migration.
 */

export const ORG_HEADER = 'x-organization-id'

export function fetchWithOrganization(
  input: RequestInfo | URL,
  init?: RequestInit,
  _options: {
    useUrlContext?: boolean
    organizationId?: string
  } = {}
): Promise<Response> {
  return fetch(input, init)
}

export function fetchWithOrgUrl(
  _organizationId: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`/api/${path}`, {
    ...init,
    headers: new Headers(init?.headers),
  })
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor(baseUrl: string = '/api', defaultHeaders: HeadersInit = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = defaultHeaders
  }

  private getHeaders(headers?: HeadersInit): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...headers,
    }
  }

  async get(path: string, options?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      ...options,
      headers: this.getHeaders(options?.headers),
    })
  }

  async post(path: string, data?: any, options?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
      headers: this.getHeaders(options?.headers),
    })
  }

  async patch(path: string, data?: any, options?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
      headers: this.getHeaders(options?.headers),
    })
  }

  async delete(path: string, options?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      ...options,
      headers: this.getHeaders(options?.headers),
    })
  }
}

export const apiClient = new ApiClient()
export const orgApiClient = new ApiClient()

export function useApiClient(_useOrgUrls: boolean = false) {
  return {
    get: (path: string, options?: RequestInit) =>
      fetch(`/api${path}`, { method: 'GET', ...options }),

    post: (path: string, data?: any, options?: RequestInit) =>
      fetch(`/api${path}`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
      }),

    patch: (path: string, data?: any, options?: RequestInit) =>
      fetch(`/api${path}`, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
      }),

    delete: (path: string, options?: RequestInit) =>
      fetch(`/api${path}`, { method: 'DELETE', ...options }),
  }
}

export function useOrgApiClient() {
  return useApiClient(false)
}
