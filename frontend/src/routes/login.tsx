import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/modules/login'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})
