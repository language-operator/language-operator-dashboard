/**
 * @jest-environment node
 *
 * Tests for GET /api/clusters/[name]/personas and POST /api/clusters/[name]/personas
 *
 * Pattern mirrors src/app/api/admin/registries/__tests__/route.test.ts:
 * - Auth: mock getServerSession to return { user: { id, email } }
 * - K8s: mock k8sClient methods directly (route calls k8sClient.listLanguagePersonas etc.)
 * - Cluster validation: mock validateClusterExists / validateClusterForResourceCreation
 *   to resolve immediately (K8s RBAC enforces real access; unit tests skip that layer)
 *
 * NOTE: jest.mock() is hoisted before variable declarations, so mocks that
 * reference outer variables must use inline jest.fn() inside the factory.
 * Access mock functions after import via `k8sClient.listLanguagePersonas as jest.Mock`.
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
    listLanguagePersonas: jest.fn(),
    createLanguagePersona: jest.fn(),
  },
}))

// Validation mocks: let the route proceed to k8s without hitting the cluster
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

const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockListPersonas = k8sClient.listLanguagePersonas as jest.Mock
const mockCreatePersona = k8sClient.createLanguagePersona as jest.Mock

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

const AUTHED_SESSION = { user: { id: 'user-1', email: 'admin@example.com' } }

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
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
  })

  it('returns paginated personas for a cluster', async () => {
    const personas = [makePersona('alpha'), makePersona('beta')]
    mockListPersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(mockListPersonas).toHaveBeenCalledWith('test-cluster')
  })

  it('handles body.items response structure from k8s', async () => {
    mockListPersonas.mockResolvedValue({ body: { items: [makePersona('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('handles data.items response structure from k8s', async () => {
    mockListPersonas.mockResolvedValue({ data: { items: [makePersona('alpha')] } })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('returns empty array when no personas exist', async () => {
    mockListPersonas.mockResolvedValue({ items: [] })

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
    mockListPersonas.mockResolvedValue({ items: personas })

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
    mockListPersonas.mockResolvedValue({ items: personas })

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
    mockListPersonas.mockResolvedValue({ items: personas })

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
    mockListPersonas.mockResolvedValue({ items: personas })

    const res = await GET(makeRequest(undefined, '?tone=professional'), makeParams())
    const body = await res.json()

    expect(body.data).toHaveLength(1)
    expect(body.data[0].metadata.name).toBe('alpha')
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error', async () => {
    mockListPersonas.mockRejectedValue(new Error('k8s unavailable'))

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })
})

// ── POST tests ─────────────────────────────────────────────────────────────

describe('POST /api/clusters/[name]/personas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
    mockCreatePersona.mockResolvedValue(makePersona('new-persona'))
  })

  it('creates a persona with CRD fields only', async () => {
    const res = await POST(
      makeRequest({ name: 'new-persona', tone: 'professional', personality: 'Methodical', expertise: 'Go engineer' }),
      makeParams()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const createdPersona = mockCreatePersona.mock.calls[0][1]
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
        // extra fields not in the CRD spec
        displayName: 'Display Name',
        description: 'A description',
        systemPrompt: 'You are...',
        language: 'en',
        instructions: ['Do this'],
      }),
      makeParams()
    )

    const createdPersona = mockCreatePersona.mock.calls[0][1]
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
    const createdPersona = mockCreatePersona.mock.calls[0][1]
    expect(createdPersona.spec).toEqual({})
  })

  it('sets correct metadata (namespace = clusterName, label, annotation)', async () => {
    await POST(makeRequest({ name: 'new-persona', tone: 'professional' }), makeParams())

    const createdPersona = mockCreatePersona.mock.calls[0][1]
    expect(createdPersona.metadata.namespace).toBe('test-cluster')
    expect(createdPersona.metadata.labels['langop.io/cluster']).toBe('test-cluster')
    expect(createdPersona.metadata.annotations['langop.io/created-by-email']).toBe('admin@example.com')
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await POST(makeRequest({ name: 'new-persona' }), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error during creation', async () => {
    mockCreatePersona.mockRejectedValue(new Error('k8s write failed'))

    const res = await POST(makeRequest({ name: 'new-persona' }), makeParams())

    expect(res.status).toBe(500)
  })
})
