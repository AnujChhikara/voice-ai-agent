import { apiClient } from '@/lib/api-client'
import { ENDPOINTS } from '@/lib/endpoints'

export type TTokenResponse = { token: string; url: string }

export const TokenApi = {
  get: {
    key: (room: string) => ['token.get', room],
    fn: async (room: string): Promise<TTokenResponse> => {
      const { data } = await apiClient.post<TTokenResponse>(ENDPOINTS.livekitToken, { room })
      return data
    },
  },
}
