import { apiClient } from '@/lib/api-client'
import { ENDPOINTS } from '@/lib/endpoints'
import type { TPromptResponse, TSetPromptRequest } from './prompt.type'

export const PromptApi = {
  get: {
    key: () => ['prompt.get'],
    fn: async (): Promise<TPromptResponse> => {
      const { data } = await apiClient.get<TPromptResponse>(ENDPOINTS.prompt)
      return data
    },
  },
  set: {
    key: () => ['prompt.set'],
    fn: async (params: TSetPromptRequest): Promise<{ ok: boolean }> => {
      const { data } = await apiClient.post<{ ok: boolean }>(ENDPOINTS.prompt, params)
      return data
    },
  },
}
