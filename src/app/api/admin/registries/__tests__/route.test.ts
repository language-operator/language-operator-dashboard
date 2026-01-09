import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { k8sClient } from '@/lib/k8s-client'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/db')
jest.mock('@/lib/k8s-client')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDb = db as jest.Mocked<typeof db>
const mockK8sClient = k8sClient as jest.Mocked<typeof k8sClient>

describe('/api/admin/registries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should fetch registries from ConfigMap successfully', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })
      
      // Mock admin membership
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        role: 'admin'
      })

      // Mock ConfigMap response with actual structure
      mockK8sClient.coreV1Api.readNamespacedConfigMap.mockResolvedValue({
        data: {
          'allowed-registries': 'docker.io\ngcr.io\n*.gcr.io\nquay.io'
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.registries).toHaveLength(4)
      expect(data.registries[0]).toEqual({
        id: 'registry-0',
        pattern: 'docker.io',
        isSystem: true
      })
      expect(data.registries[1]).toEqual({
        id: 'registry-1', 
        pattern: 'gcr.io',
        isSystem: true
      })
    })

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })
      
      // Mock non-admin membership
      mockDb.organizationMember.findFirst.mockResolvedValue(null)

      const response = await GET()
      
      expect(response.status).toBe(403)
    })

    it('should handle ConfigMap not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })
      
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1', 
        role: 'admin'
      })

      // Mock 404 error
      const error = new Error('Not found')
      ;(error as any).statusCode = 404
      mockK8sClient.coreV1Api.readNamespacedConfigMap.mockRejectedValue(error)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.registries).toEqual([
        { id: 'registry-0', pattern: 'docker.io', isSystem: true },
        { id: 'registry-1', pattern: 'gcr.io', isSystem: true },
        { id: 'registry-2', pattern: '*.gcr.io', isSystem: true },
        { id: 'registry-3', pattern: 'quay.io', isSystem: true },
        { id: 'registry-4', pattern: 'ghcr.io', isSystem: true },
        { id: 'registry-5', pattern: 'registry.k8s.io', isSystem: true }
      ])
    })
  })
})