/**
 * @jest-environment node
 *
 * API route tests must use the node environment (not jsdom) because
 * Next.js server internals depend on Node globals (Request, Response, etc.).
 * Add this docblock to every __tests__ file under src/app/api/.
 *
 * Tests for /api/admin/registries
 *
 * Pattern for API route tests in this codebase:
 *
 * 1. Auth: mock `next-auth`'s getServerSession to return a user with { id, email }.
 *    getAuthenticatedUser() reads from getServerSession — no db mock needed.
 *
 * 2. K8s: mock `@/lib/k8s-client` so k8sClient.forUser() returns a plain object
 *    of jest.fn()s. The route calls forUser(email) then uses the returned client,
 *    so the mock must be at the forUser level, not on k8sClient directly.
 *
 * 3. Requests: build minimal NextRequest-shaped objects with a json() mock.
 *    For routes that don't read the body (GET), pass a bare object.
 *
 * 4. Access control: this route has no application-level permission check —
 *    K8s RBAC enforces it. A 403 from K8s surfaces as a 500 here because
 *    the route catches all non-404 k8s errors as internal errors.
 */

import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

// NextResponse doesn't initialise cleanly in Jest's Node environment because
// it depends on Web API globals (Response, Headers) that aren't provided by
// the Node test runner. Mock it to a minimal shape that mirrors the real API.
// All API route test files under src/app/api/ should include this mock.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    })),
  },
}))

jest.mock('next-auth')

// k8s methods returned by forUser() — reset in beforeEach
const mockK8s = {
  readConfigMap: jest.fn(),
  replaceConfigMap: jest.fn(),
  createConfigMap: jest.fn(),
}

jest.mock('@/lib/k8s-client', () => ({
  k8sClient: { forUser: jest.fn(() => mockK8s) },
}))

const mockSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest
}

const AUTHED_SESSION = { user: { id: 'user-1', email: 'admin@example.com' } }

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/admin/registries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
  })

  it('returns parsed registries from ConfigMap', async () => {
    mockK8s.readConfigMap.mockResolvedValue({
      data: { 'allowed-registries': 'docker.io\ngcr.io\n*.gcr.io\nquay.io' },
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.registries).toEqual([
      { id: 'registry-0', pattern: 'docker.io' },
      { id: 'registry-1', pattern: 'gcr.io' },
      { id: 'registry-2', pattern: '*.gcr.io' },
      { id: 'registry-3', pattern: 'quay.io' },
    ])
  })

  it('returns empty array when ConfigMap does not exist (404)', async () => {
    const err = Object.assign(new Error('Not found'), { statusCode: 404 })
    mockK8s.readConfigMap.mockRejectedValue(err)

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.registries).toEqual([])
  })

  it('returns empty array when ConfigMap has no registry key', async () => {
    mockK8s.readConfigMap.mockResolvedValue({ data: {} })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.registries).toEqual([])
  })

  it('filters blank lines from registry data', async () => {
    mockK8s.readConfigMap.mockResolvedValue({
      data: { 'allowed-registries': 'docker.io\n\n  \ngcr.io\n' },
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.registries).toHaveLength(2)
    expect(body.registries.map((r: any) => r.pattern)).toEqual(['docker.io', 'gcr.io'])
  })

  it('returns 500 for non-404 k8s errors', async () => {
    mockK8s.readConfigMap.mockRejectedValue(new Error('connection refused'))

    const res = await GET(makeRequest())

    expect(res.status).toBe(500)
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/registries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession.mockResolvedValue(AUTHED_SESSION as any)
  })

  it('updates existing ConfigMap with sorted, deduplicated registries', async () => {
    mockK8s.readConfigMap.mockResolvedValue({
      metadata: { name: 'language-operator-config' },
      data: { 'allowed-registries': 'docker.io' },
    })
    mockK8s.replaceConfigMap.mockResolvedValue({})

    const res = await POST(makeRequest({ registries: ['gcr.io', 'docker.io', '*.example.com'] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockK8s.replaceConfigMap).toHaveBeenCalledWith(
      'language-operator',
      'language-operator-config',
      expect.objectContaining({
        data: { 'allowed-registries': '*.example.com\ndocker.io\ngcr.io' },
      })
    )
    expect(mockK8s.createConfigMap).not.toHaveBeenCalled()
  })

  it('creates a new ConfigMap when one does not exist', async () => {
    const notFound = Object.assign(new Error('Not found'), { statusCode: 404 })
    mockK8s.readConfigMap.mockRejectedValue(notFound)
    mockK8s.createConfigMap.mockResolvedValue({})

    const res = await POST(makeRequest({ registries: ['docker.io', 'gcr.io'] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockK8s.createConfigMap).toHaveBeenCalledWith(
      'language-operator',
      expect.objectContaining({
        kind: 'ConfigMap',
        data: { 'allowed-registries': 'docker.io\ngcr.io' },
      })
    )
    expect(mockK8s.replaceConfigMap).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid registry patterns', async () => {
    const res = await POST(makeRequest({ registries: ['invalid..pattern', 'docker.io'] }))

    expect(res.status).toBe(400)
    expect(mockK8s.replaceConfigMap).not.toHaveBeenCalled()
  })

  it('returns 400 when registries is not an array', async () => {
    const res = await POST(makeRequest({ registries: 'docker.io' }))

    expect(res.status).toBe(400)
  })

  it('returns 500 for k8s errors during write', async () => {
    mockK8s.readConfigMap.mockResolvedValue({
      metadata: { name: 'language-operator-config' },
      data: {},
    })
    mockK8s.replaceConfigMap.mockRejectedValue(new Error('k8s unavailable'))

    const res = await POST(makeRequest({ registries: ['docker.io'] }))

    expect(res.status).toBe(500)
  })

  it('returns 500 when unauthenticated', async () => {
    mockSession.mockResolvedValue(null)

    const res = await POST(makeRequest({ registries: ['docker.io'] }))

    expect(res.status).toBe(500)
  })
})
