import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersApi } from '@/api/users/users.api'
import { AuthApi } from '@/api/auth/auth.api'

const DEFAULT_USER = { sub: '', email: '', name: '', picture: '' }

export const useAuth = () => {
  const queryClient = useQueryClient()

  const { data: user, isLoading, isError } = useQuery({
    retry: false,
    staleTime: 15 * 60 * 1000,
    queryKey: UsersApi.getUserInfo.key,
    queryFn: UsersApi.getUserInfo.fn,
  })

  const logoutMutation = useMutation({
    mutationFn: AuthApi.logout.fn,
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/login'
    },
  })

  return { user: user || DEFAULT_USER, isLoading, isError, isLoggedIn: !!user, logoutMutation }
}
