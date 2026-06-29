import { apiClient } from '@/lib/api-client'
import { ENDPOINTS } from '@/lib/endpoints'

export type TUser = {
  sub: string
  email: string
  name: string
  picture: string
}

export type TTokenResponse = { token: string; url: string; room: string }

export const UserApi = {
  me: {
    key: ['user.me'],
    fn: async (): Promise<TUser> => {
      const { data } = await apiClient.get<TUser>('/api/auth/me')
      return data
    },
  },
  logout: {
    key: ['user.logout'],
    fn: async (): Promise<void> => {
      await apiClient.post('/api/auth/logout')
    },
  },
  token: {
    key: () => ['user.token'],
    fn: async (): Promise<TTokenResponse> => {
      const { data } = await apiClient.post<TTokenResponse>(ENDPOINTS.livekitToken)
      return data
    },
  },
}
