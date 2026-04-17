/**
 * @jest-environment node
 *
 * Tests for GET /api/clusters/[name]
 *
 * Auth: mock `next-auth/jwt`'s getToken to return { sub, k8sToken }.
 * K8s: mock k8sClient.forToken() to return a plain object of jest.fn()s.
 */

import { GET } from '../route'
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
  getLanguageCluster: jest.fn(),
}

jest.mock('@/lib/k8s-client', () => ({
  k8sClient: { forToken: jest.fn(() => mockK8s) },
  extractItem: (response: unknown) => {
    const r = response as Record<string, unknown>
    if (r?.body) return r.body
    if (r?.data) return r.data
    if (r) return r
    return null
  },
}))

jest.mock('@/lib/api-error-handler', () => ({
  extractK8sStatusCode: jest.fn(() => null),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return {
    url: 'http://localhost/api/clusters/my-cluster',
    json: jest.fn(),
  } as unknown as NextRequest
}

function makeParams(name = 'my-cluster') {
  return { params: Promise.resolve({ name }) }
}

const AUTHED_TOKEN = { sub: 'user-1', k8sToken: 'test-token' }

function makeCluster(name: string) {
  return {
    apiVersion: 'langop.io/v1alpha1',
    kind: 'LanguageCluster',
    metadata: {
      name,
      creationTimestamp: '2024-01-01T00:00:00Z',
    },
    spec: {},
    status: { phase: 'Ready' },
  }
}

// ── GET tests ──────────────────────────────────────────────────────────────

describe('GET /api/clusters/[name]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetToken.mockResolvedValue(AUTHED_TOKEN as any)
  })

  it('returns the cluster with namespace injected', async () => {
    mockK8s.getLanguageCluster.mockResolvedValue(makeCluster('my-cluster'))

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cluster.metadata.name).toBe('my-cluster')
    expect(body.cluster.metadata.namespace).toBe('language-operator')
  })

  it('handles body-wrapped k8s response and injects namespace', async () => {
    mockK8s.getLanguageCluster.mockResolvedValue({ body: makeCluster('my-cluster') })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cluster.metadata.namespace).toBe('language-operator')
  })

  it('handles data-wrapped k8s response and injects namespace', async () => {
    mockK8s.getLanguageCluster.mockResolvedValue({ data: makeCluster('my-cluster') })

    const res = await GET(makeRequest(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cluster.metadata.namespace).toBe('language-operator')
  })

  it('returns 404 when cluster not found', async () => {
    mockK8s.getLanguageCluster.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(404)
  })

  it('returns 500 when unauthenticated', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })

  it('returns 500 on k8s error', async () => {
    mockK8s.getLanguageCluster.mockRejectedValue(new Error('k8s unavailable'))

    const res = await GET(makeRequest(), makeParams())

    expect(res.status).toBe(500)
  })
})
