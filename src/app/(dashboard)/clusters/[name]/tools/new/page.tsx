'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ToolForm, ToolFormData } from '@/components/forms/tool-form'

export default function CreateClusterToolPage() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (formData: ToolFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        image: formData.image,
        endpoint: formData.endpoint,
        port: formData.port,
        healthCheckPath: formData.healthCheckPath,
        envVars: formData.envVars,
        resources: formData.resources,
        enabled: formData.enabled,
        requireApproval: formData.requireApproval,
        timeout: formData.timeout,
        retries: formData.retries,
        egressRules: (formData as typeof formData & { egressRules?: unknown }).egressRules,
      }
      
      console.log('Sending payload:', payload)
      
      const response = await fetch(`/api/clusters/${clusterName}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        
        if (errorData.details && Array.isArray(errorData.details)) {
          interface ErrorDetail { path: string; message: string }
          const detailMessages = (errorData.details as ErrorDetail[]).map((d) => `${d.path}: ${d.message}`).join(', ')
          throw new Error(`${errorData.error || 'Validation failed'}: ${detailMessages}`)
        }
        
        throw new Error(errorData.error || 'Failed to create tool')
      }

      const result = await response.json()
      console.log('Create tool result:', result)
      
      // Redirect to cluster tools list page
      router.push(`/clusters/${clusterName}/tools`)
    } catch (err) {
      console.error('Error creating tool:', err)
      setError(err instanceof Error ? err.message : 'Failed to create tool')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/clusters/${clusterName}/tools`)
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light">Create Language Tool</h1>
          <p className="text-muted-foreground mt-1">
            Add a new language tool to the {clusterName} cluster
          </p>
        </div>

        {/* Form */}
        <div className="max-w-4xl">
          <ToolForm
            isLoading={isLoading}
            error={error}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
  )
}