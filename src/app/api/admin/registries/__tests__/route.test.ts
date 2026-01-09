import { GET, POST } from '../route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/db')
jest.mock('@/lib/k8s-client', () => ({
  k8sClient: {
    readConfigMap: jest.fn(),
    replaceConfigMap: jest.fn(),
    createConfigMap: jest.fn(),
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDb = db as jest.Mocked<typeof db>

// Import after mocking to get the mocked instance
import { k8sClient } from '@/lib/k8s-client'
const mockK8sClient = k8sClient as any

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
      } as any)

      // Mock ConfigMap response with actual structure
      mockK8sClient.readConfigMap.mockResolvedValue({
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
        pattern: 'docker.io'
      })
      expect(data.registries[1]).toEqual({
        id: 'registry-1', 
        pattern: 'gcr.io'
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
      } as any)

      // Mock 404 error
      const error = new Error('Not found')
      ;(error as any).statusCode = 404
      mockK8sClient.readConfigMap.mockRejectedValue(error)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.registries).toEqual([])
    })
  })

  describe('POST', () => {
    it('should update registries in ConfigMap successfully', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })
      
      // Mock admin membership
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        role: 'admin'
      } as any)

      // Mock existing ConfigMap
      mockK8sClient.readConfigMap.mockResolvedValue({
        metadata: { name: 'language-operator-config' },
        data: { 'allowed-registries': 'docker.io' }
      })

      // Mock ConfigMap update
      mockK8sClient.replaceConfigMap.mockResolvedValue({})

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          registries: ['gcr.io', 'docker.io', '*.example.com']
        })
      } as any

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockK8sClient.replaceConfigMap).toHaveBeenCalledWith(
        'language-operator',
        'language-operator-config',
        expect.objectContaining({
          data: {
            'allowed-registries': '*.example.com\ndocker.io\ngcr.io'
          }
        })
      )
    })

    it('should return 400 for invalid registry patterns', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })
      
      // Mock admin membership
      mockDb.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        role: 'admin'
      } as any)

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          registries: ['invalid..pattern', 'docker.io']
        })
      } as any

      const response = await POST(mockRequest)
      
      expect(response.status).toBe(400)
    })
  })
})