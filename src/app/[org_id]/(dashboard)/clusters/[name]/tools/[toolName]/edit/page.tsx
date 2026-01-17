'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ToolEditForm, ToolEditFormData } from '@/components/forms/tool-edit-form'
import { useTool } from '@/hooks/use-tools'
import { useOrganization } from '@/components/organization-provider'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditClusterToolPage() {
  const router = useRouter()
  const params = useParams()
  const { getOrgUrl } = useOrganization()
  const clusterName = params?.name as string
  const toolName = params?.toolName as string
  
  const { data: toolResponse, isLoading: isLoadingTool, error: fetchError } = useTool(toolName, clusterName)
  const tool = toolResponse?.data
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialData, setInitialData] = useState<Partial<ToolEditFormData>>()

  useEffect(() => {
    if (tool) {
      setInitialData({
        image: tool.spec.image || '',
        port: tool.spec.port || 3000,
        deploymentMode: (tool.spec.deploymentMode || 'service') as 'service' | 'sidecar',
        envVars: tool.spec.env?.map((env: { name: string; value?: string }) => ({
          key: env.name,
          value: env.value || ''
        })) || [],
        resources: {
          cpu: tool.spec.resources?.requests?.cpu || '100m',
          memory: tool.spec.resources?.requests?.memory || '128Mi',
          cpuLimit: tool.spec.resources?.limits?.cpu || '500m',
          memoryLimit: tool.spec.resources?.limits?.memory || '512Mi'
        },
        egress: tool.spec.egress?.map((rule: any) => ({
          description: rule.description || '',
          to: {
            dns: rule.to?.dns || [],
            cidr: rule.to?.cidr || ''
          },
          ports: rule.ports?.map((port: any) =>
            typeof port === 'object' && port.port ? port.port : port
          ) || []
        })) || []
      })
    }
  }, [tool])

  const handleSubmit = async (formData: ToolEditFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // Normalize egress data: ensure ports and DNS are arrays, not strings
      const normalizedFormData = {
        ...formData,
        egress: formData.egress?.map(rule => ({
          ...rule,
          ports: typeof rule.ports === 'string'
            ? rule.ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0 && p < 65536)
            : rule.ports,
          to: {
            ...rule.to,
            dns: typeof rule.to.dns === 'string'
              ? rule.to.dns.split(',').map(d => d.trim()).filter(d => d.length > 0)
              : rule.to.dns
          }
        }))
      }

      console.log('Updating tool with payload:', normalizedFormData)

      const response = await fetch(`/api/clusters/${clusterName}/tools/${toolName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join(', ')
          throw new Error(`${errorData.error || 'Validation failed'}: ${detailMessages}`)
        }
        
        throw new Error(errorData.error || 'Failed to update tool')
      }

      const result = await response.json()
      console.log('Update tool result:', result)
      
      // Redirect to tool detail page
      router.push(getOrgUrl(`/clusters/${clusterName}/tools/${toolName}`))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tool'
      console.error('Error updating tool:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(getOrgUrl(`/clusters/${clusterName}/tools/${toolName}`))
  }

  if (isLoadingTool) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <p className="text-gray-600">Tool not found</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ToolEditForm
        initialData={initialData}
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}