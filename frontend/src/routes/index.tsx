import { createFileRoute } from '@tanstack/react-router'
import { Home } from '@/modules/home'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    panel: (search.panel as 'settings' | 'history') || undefined,
    view:  (search.view  as 'voice' | 'transcript') || undefined,
  }),
  component: Home,
})
