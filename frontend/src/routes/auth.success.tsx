import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/success')({
  component: AuthSuccess,
})

function AuthSuccess() {
  const navigate = useNavigate()
  useEffect(() => { navigate({ to: '/' }) }, [navigate])
  return null
}
