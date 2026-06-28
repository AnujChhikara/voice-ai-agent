import { apiClient } from '@/lib/api-client'

export const AuthApi = {
  logout: {
    key: ['auth.logout'],
    fn: async (): Promise<void> => {
      await apiClient.post('/api/auth/logout')
    },
  },
}
