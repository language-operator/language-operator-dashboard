/**
 * @jest-environment node
 *
 * Tests for GET /api/clusters/[name]/personas and POST /api/clusters/[name]/personas
 *
 * Auth: mock `next-auth/jwt`'s getToken to return { sub, k8sToken }.
 * K8s: mock k8sClient.forToken() to return a plain object of jest.fn()s.
 * Cluster validation: mock validateClusterExists / validateClusterForResourceCreation
 * to resolve immediately (K8s RBAC enforces real access; unit tests skip that layer).
 */

import { GET, POST } from '../route'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    })),
  },
}))

jest.mock('next-auth/jwt')

const mockK8s = {
  listLanguagePersonas: jest.fn(),
  createLanguagePersona: jest.fn(),
}

jest.mock('@/lib/k8s-client', () => ({
  k8sClient: { forToken: jest.fn(() => mockK8s) },
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

jest.mock('@/lib/validation', () => ({
  safeValidateLanguagePersona: jest.fn().mockReturnValue({ success: true }),
}))

jest.mock('@/lib/cluster-utils', () => ({
  filterByClusterRef: jest.fn((items: unknown[]) => items),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown, search = ''): NextRequest {
  return {
    url: `http://localhost/api/clusters/test-cluster/personas${search}`,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function makeParams(name = 'test-cluster') {
  return { params: Promise.resolve({ name }) }
}

const AUTHED_TOKEN = { sub: 'user-1', k8sToken: 'test-token' }

function makePersona(name: string, specOverrides: Record<string, unknown> = {}) {
  return {
    apiVersion: 'langop.io/v1alpha1',
    kind: 'LanguagePersona',
    metadata: {
      name,
      namespace: 'test-cluster',
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {
      tone: 'professional',
      personality: 'Methodical and precise',
      expertise: 'Senior Go engineer',
      ...specOverrides,
    },
    status: { phase: 'Ready' },
  }
}

// ── GET tests ──────────────────────────────────────────────────────────────

describe('GET /api/clusters/[name]/personas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetToken.mockResolvedValue(AUTHED_TOKEN as any)
  })

  it('returns paginated personas for a cluster', async () => {
    const personas = [makePersona('alpha'), makePersona('beta')]
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(mockK8s.listLanguagePersonas).toHaveBeenCalledWith('test-cluster')
  })

  it('handles body.items response structure from k8s', async () => {
    mockK8s.listLanguagePersonas.mockResolvedValue({ body: { items: [makePersona('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('handles data.items response structure from k8s', async () => {
    mockK8s.listLanguagePersonas.mockResolvedValue({ data: { items: [makePersona('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('returns empty array when no personas exist', async () => {
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: [] })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(0)
  })

  it('filters by name when search query provided', async () => {
    const personas = [
      makePersona('go-engineer', { expertise: 'Go language expert' }),
      makePersona('python-expert', { expertise: 'Python developer' }),
    ]
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(undefined, '?search=go'), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('go-engineer')
  })

  it('filters by personality when search query matches', async () => {
    const personas = [
      makePersona('alpha', { personality: 'Curious and experimental' }),
      makePersona('beta', { personality: 'Methodical and precise' }),
    ]
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(undefined, '?search=methodical'), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('beta')
  })

  it('filters by expertise when search query matches', async () => {
    const personas = [
      makePersona('alpha', { expertise: 'Senior Go engineer' }),
      makePersona('beta', { expertise: 'Python data scientist' }),
    ]
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(undefined, '?search=python'), makeParams())
    const body = await res.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('beta')
  })

  it('filters by tone query param', async () => {
    const personas = [
      makePersona('alpha', { tone: 'professional' }),
      makePersona('beta', { tone: 'casual' }),
    ]
    mockK8s.listLanguagePersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(undefined, '?tone=professional'), makeParams())
    const body = await res.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('alpha')
  })

  it('returns 500 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error', async () => {
    mockK8s.listLanguagePersonas.mockRejectedValue(new Error('k8s unavailable'))

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })
})

// ── POST tests ─────────────────────────────────────────────────────────────

describe('POST /api/clusters/[name]/personas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetToken.mockResolvedValue(AUTHED_TOKEN as any)
    mockK8s.createLanguagePersona.mockResolvedValue(makePersona('new-persona'))
  })

  it('creates a persona with CRD fields only', async () => {
    const res = await POST(
      makeRequest({ name: 'new-persona', tone: 'professional', personality: 'Methodical', expertise: 'Go engineer' }),
      makeParams()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const createdPersona = mockK8s.createLanguagePersona.mock.calls[0][1]
    expect(createdPersona.spec).toEqual({
      tone: 'professional',
      personality: 'Methodical',
      expertise: 'Go engineer',
    })
  })

  it('does not write non-CRD fields to spec', async () => {
    await POST(
      makeRequest({
        name: 'new-persona',
        tone: 'professional',
        displayName: 'Display Name',
        description: 'A description',
        systemPrompt: 'You are...',
        language: 'en',
        instructions: ['Do this'],
      }),
      makeParams()
    )

    const createdPersona = mockK8s.createLanguagePersona.mock.calls[0][1]
    expect(createdPersona.spec).not.toHaveProperty('displayName')
    expect(createdPersona.spec).not.toHaveProperty('description')
    expect(createdPersona.spec).not.toHaveProperty('systemPrompt')
    expect(createdPersona.spec).not.toHaveProperty('language')
    expect(createdPersona.spec).not.toHaveProperty('instructions')
  })

  it('creates persona with only name (all spec fields optional)', async () => {
    const res = await POST(makeRequest({ name: 'minimal-persona' }), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    const createdPersona = mockK8s.createLanguagePersona.mock.calls[0][1]
    expect(createdPersona.spec).toEqual({})
  })

  it('sets correct metadata (namespace = clusterName, label, annotation)', async () => {
    await POST(makeRequest({ name: 'new-persona', tone: 'professional' }), makeParams())

    const createdPersona = mockK8s.createLanguagePersona.mock.calls[0][1]
    expect(createdPersona.metadata.namespace).toBe('test-cluster')
    expect(createdPersona.metadata.labels['langop.io/cluster']).toBe('test-cluster')
    expect(createdPersona.metadata.annotations['langop.io/created-by']).toBe('user-1')
  })

  it('returns 500 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await POST(makeRequest({ name: 'new-persona' }), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error during creation', async () => {
    mockK8s.createLanguagePersona.mockRejectedValue(new Error('k8s write failed'))

    const res = await POST(makeRequest({ name: 'new-persona' }), makeParams())

    expect(res.status).toBe(500)
  })
})
