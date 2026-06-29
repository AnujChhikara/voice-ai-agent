import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserApi } from '@/api/user/user.api'

const DEFAULT_USER = { sub: '', email: '', name: '', picture: '' }

export const useAuth = () => {
  const queryClient = useQueryClient()

  const { data: user, isLoading, isError } = useQuery({
    retry: false,
    staleTime: 15 * 60 * 1000,
    queryKey: UserApi.me.key,
    queryFn: UserApi.me.fn,
  })

  const logoutMutation = useMutation({
    mutationFn: UserApi.logout.fn,
    onSuccess: () => {
      queryClient.clear()
      window.location.href = '/login'
    },
  })

  return { user: user || DEFAULT_USER, isLoading, isError, isLoggedIn: !!user, logoutMutation }
}
