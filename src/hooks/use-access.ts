import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface AccessBinding {
  name: string
  role: string
  subjects: { kind: string; name: string }[]
  createdAt?: string
}

export function useAccess(clusterName: string) {
  return useQuery({
    queryKey: ['access', clusterName],
    queryFn: async () => {
      const response = await fetch(`/api/clusters/${clusterName}/access`)
      if (!response.ok) throw new Error('Failed to fetch access bindings')
      return response.json() as Promise<{ success: boolean; data: AccessBinding[] }>
    },
    enabled: !!clusterName,
  })
}

export function useGrantAccess(clusterName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userEmail, role }: { userEmail: string; role: string }) => {
      const response = await fetch(`/api/clusters/${clusterName}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, role }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to grant access')
      }
      return response.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['access', clusterName] })
    },
  })
}

export function useRevokeAccess(clusterName: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bindingName: string) => {
      const response = await fetch(`/api/clusters/${clusterName}/access/${bindingName}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to revoke access')
      }
      return response.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['access', clusterName] })
    },
  })
}
