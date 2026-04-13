/**
 * @jest-environment node
 *
 * Tests for GET /api/clusters/[name]/models and POST /api/clusters/[name]/models
 *
 * Pattern mirrors src/app/api/clusters/[name]/personas/__tests__/route.test.ts:
 * - Auth: mock getServerSession to return { user: { id, email } }
 * - K8s: mock k8sClient methods directly
 * - Cluster validation: mock validateClusterExists to resolve immediately
 */

import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { k8sClient } from '@/lib/k8s-client'

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    })),
  },
}))

jest.mock('next-auth')

jest.mock('@/lib/k8s-client', () => ({
  k8sClient: {
    listLanguageModels: jest.fn(),
    createLanguageModel: jest.fn(),
  },
  extractItems: (response: unknown) => {
    const r = response as Record<string, unknown>
    return (
      ((r?.body as Record<string, unknown>)?.items as unknown[]) ??
      ((r?.data as Record<string, unknown>)?.items as unknown[]) ??
      (r?.items as unknown[]) ??
      []
    )
  },
  extractItem: (response: unknown) => {
    const r = response as Record<string, unknown>
    if (r?.body) return r.body
    if (r?.data) return r.data
    if (r) return r
    return null
  },
}))

jest.mock('@/lib/cluster-validation', () => ({
  validateClusterExists: jest.fn().mockResolvedValue(undefined),
  validateClusterForResourceCreation: jest.fn().mockResolvedValue(undefined),
  validateResourceBelongsToCluster: jest.fn((items: unknown[]) => items),
}))

jest.mock('@/lib/cluster-utils', () => ({
  filterByClusterRef: jest.fn((items: unknown[]) => items),
}))

const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockListModels = k8sClient.listLanguageModels as jest.Mock
const mockCreateModel = k8sClient.createLanguageModel as jest.Mock

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown, search = ''): NextRequest {
  return {
    url: `http://localhost/api/clusters/test-cluster/models${search}`,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeParams(name = 'test-cluster') {
  return { params: Promise.resolve({ name }) }
}

const AUTHED_SESSION = { user: { id: 'user-1', email: 'admin@example.com' } }

function makeModel(name: string, specOverrides: Record<string, unknown> = {}) {
  return {
    apiVersion: 'langop.io/v1alpha1',
    kind: 'LanguageModel',
    metadata: {
      name,
      namespace: 'test-cluster',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {
      provider: 'openai',
      modelName: 'gpt-4o',
      ...specOverrides,
    },
    status: { phase: 'Ready' },
  }
}

// ── GET tests ──────────────────────────────────────────────────────────────

describe('GET /api/clusters/[name]/models', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
  })

  it('returns models for a cluster', async () => {
    const models = [makeModel('alpha'), makeModel('beta')]
    mockListModels.mockResolvedValue({ items: models })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(mockListModels).toHaveBeenCalledWith('test-cluster')
  })

  it('handles body.items response structure from k8s', async () => {
    mockListModels.mockResolvedValue({ body: { items: [makeModel('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('handles data.items response structure from k8s', async () => {
    mockListModels.mockResolvedValue({ data: { items: [makeModel('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('returns empty array when no models exist', async () => {
    mockListModels.mockResolvedValue({ items: [] })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(0)
  })

  it('filters by name when search query provided', async () => {
    const models = [
      makeModel('gpt4-prod', { provider: 'openai', modelName: 'gpt-4o' }),
      makeModel('claude-staging', { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' }),
    ]
    mockListModels.mockResolvedValue({ items: models })

    const res = await GET(makeRequest(undefined, '?search=gpt'), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('gpt4-prod')
  })

  it('filters by provider when search query matches', async () => {
    const models = [
      makeModel('alpha', { provider: 'openai', modelName: 'gpt-4o' }),
      makeModel('beta', { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' }),
    ]
    mockListModels.mockResolvedValue({ items: models })

    const res = await GET(makeRequest(undefined, '?search=anthropic'), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('beta')
  })

  it('filters by provider query param', async () => {
    const models = [
      makeModel('alpha', { provider: 'openai' }),
      makeModel('beta', { provider: 'anthropic' }),
    ]
    mockListModels.mockResolvedValue({ items: models })

    const res = await GET(makeRequest(undefined, '?provider=anthropic'), makeParams())
    const body = await res.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('beta')
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error', async () => {
    mockListModels.mockRejectedValue(new Error('k8s unavailable'))

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })
})

// ── POST tests ─────────────────────────────────────────────────────────────

describe('POST /api/clusters/[name]/models', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
    mockCreateModel.mockResolvedValue(makeModel('new-model'))
  })

  it('creates a model with CRD fields only', async () => {
    const res = await POST(
      makeRequest({ name: 'new-model', provider: 'openai', modelName: 'gpt-4o' }),
      makeParams()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const created = mockCreateModel.mock.calls[0][1]
    expect(created.spec.provider).toBe('openai')
    expect(created.spec.modelName).toBe('gpt-4o')
  })

  it('does not write non-CRD fields to spec', async () => {
    await POST(
      makeRequest({
        name: 'new-model',
        provider: 'openai',
        modelName: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
        costTrackingEnabled: true,
        cachingEnabled: false,
      }),
      makeParams()
    )

    const created = mockCreateModel.mock.calls[0][1]
    expect(created.spec).not.toHaveProperty('temperature')
    expect(created.spec).not.toHaveProperty('maxTokens')
    expect(created.spec).not.toHaveProperty('topP')
    expect(created.spec).not.toHaveProperty('costTrackingEnabled')
    expect(created.spec).not.toHaveProperty('cachingEnabled')
  })

  it('includes optional CRD fields when provided', async () => {
    await POST(
      makeRequest({
        name: 'new-model',
        provider: 'openai-compatible',
        modelName: 'llama3:8b',
        endpoint: 'http://localhost:11434/v1',
        apiKeySecretName: 'llama-secret',
        apiKeySecretKey: 'api-key',
        requestsPerMinute: 60,
        tokensPerMinute: 10000,
        timeout: '5m',
      }),
      makeParams()
    )

    const created = mockCreateModel.mock.calls[0][1]
    expect(created.spec.endpoint).toBe('http://localhost:11434/v1')
    expect(created.spec.apiKeySecretRef).toEqual({ name: 'llama-secret', key: 'api-key' })
    expect(created.spec.rateLimits).toEqual({ requestsPerMinute: 60, tokensPerMinute: 10000 })
    expect(created.spec.timeout).toBe('5m')
  })

  it('sets correct metadata (namespace = clusterName, label)', async () => {
    await POST(
      makeRequest({ name: 'new-model', provider: 'openai', modelName: 'gpt-4o' }),
      makeParams()
    )

    const created = mockCreateModel.mock.calls[0][1]
    expect(created.metadata.namespace).toBe('test-cluster')
    expect(created.metadata.labels['langop.io/cluster']).toBe('test-cluster')
  })

  it('returns 500 when name is missing', async () => {
    const res = await POST(
      makeRequest({ provider: 'openai', modelName: 'gpt-4o' }),
      makeParams()
    )

    expect(res.status).toBe(500)
    expect(mockCreateModel).not.toHaveBeenCalled()
  })

  it('returns 500 when provider is missing', async () => {
    const res = await POST(
      makeRequest({ name: 'new-model', modelName: 'gpt-4o' }),
      makeParams()
    )

    expect(res.status).toBe(500)
    expect(mockCreateModel).not.toHaveBeenCalled()
  })

  it('returns 500 when modelName is missing', async () => {
    const res = await POST(
      makeRequest({ name: 'new-model', provider: 'openai' }),
      makeParams()
    )

    expect(res.status).toBe(500)
    expect(mockCreateModel).not.toHaveBeenCalled()
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await POST(
      makeRequest({ name: 'new-model', provider: 'openai', modelName: 'gpt-4o' }),
      makeParams()
    )

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error during creation', async () => {
    mockCreateModel.mockRejectedValue(new Error('k8s write failed'))

    const res = await POST(
      makeRequest({ name: 'new-model', provider: 'openai', modelName: 'gpt-4o' }),
      makeParams()
    )

    expect(res.status).toBe(500)
  })
})
