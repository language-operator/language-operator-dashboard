import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LanguageAgentRuntimeFormData, LanguageAgentRuntimeListParams } from '@/types/runtime'

export function useRuntimes(params?: LanguageAgentRuntimeListParams) {
  return useQuery({
    queryKey: ['runtimes', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.search) searchParams.append('search', params.search)
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)

      const response = await fetch(`/api/runtimes?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch runtimes')
      }
      return response.json()
    },
  })
}

export function useRuntime(name: string) {
  return useQuery({
    queryKey: ['runtimes', name],
    queryFn: async () => {
      const response = await fetch(`/api/runtimes/${name}`)
      if (!response.ok) {
        throw new Error('Failed to fetch runtime')
      }
      return response.json()
    },
    enabled: !!name,
  })
}

export function useCreateRuntime() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: LanguageAgentRuntimeFormData) => {
      const response = await fetch('/api/runtimes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create runtime')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runtimes'] })
    },
  })
}

export function useUpdateRuntime() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, formData }: { name: string; formData: LanguageAgentRuntimeFormData }) => {
      const response = await fetch(`/api/runtimes/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update runtime')
      }
      return response.json()
    },
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['runtimes'] })
      queryClient.invalidateQueries({ queryKey: ['runtimes', name] })
    },
  })
}

export function useDeleteRuntime() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/runtimes/${name}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete runtime')
      }
      return response.json()
    },
    onSuccess: (_, name) => {
      queryClient.removeQueries({ queryKey: ['runtimes', name] })
      queryClient.invalidateQueries({ queryKey: ['runtimes'] })
    },
  })
}
