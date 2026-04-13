import { useQuery } from '@tanstack/react-query'
import { LanguageAgentSelfConfigListResponse } from '@/types/selfconfig'

export function useAgentSelfConfigs(agentName: string, clusterName: string) {
  return useQuery<LanguageAgentSelfConfigListResponse>({
    queryKey: ['selfconfigs', clusterName, agentName],
    queryFn: async () => {
      const response = await fetch(
        `/api/clusters/${clusterName}/agents/${agentName}/selfconfigs`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch self-configs')
      }
      return response.json()
    },
    enabled: !!agentName && !!clusterName,
  })
}
