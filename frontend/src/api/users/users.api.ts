import { apiClient } from '@/lib/api-client'

export type TUser = {
  sub: string
  email: string
  name: string
  picture: string
}

export const UsersApi = {
  getUserInfo: {
    key: ['users.getUserInfo'],
    fn: async (): Promise<TUser> => {
      const { data } = await apiClient.get<TUser>('/api/auth/me')
      return data
    },
  },
}
