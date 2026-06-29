import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAgent } from '@/hooks/useAgent'
import { DocumentsApi } from '@/api/documents/documents.api'
import { LoginPage } from '@/modules/login'
import { LandingView } from './LandingView'
import { ConnectedView } from './ConnectedView'
import { SettingsPanel } from './SettingsPanel'
import { HistoryPanel } from './HistoryPanel'
import { Route } from '@/routes/index'

type RouteSearch = { panel?: 'settings' | 'history'; view?: 'voice' | 'transcript' }

export function Home() {
  const { isLoading, isLoggedIn, logoutMutation } = useAuth()
  const { connected, muted, transcript, error, connect, disconnect, toggleMute, userSpeaking, agentSpeaking, agentThinking, ragMeta } = useAgent()

  const navigate = useNavigate({ from: '/' })
  const { panel, view } = Route.useSearch()
  const queryClient = useQueryClient()

  const voiceMode = view !== 'transcript'

  useEffect(() => {
    if (connected) navigate({ search: (prev: RouteSearch) => ({ ...prev, view: 'voice' as const }) })
  }, [connected])

  const uploadMutation = useMutation({
    mutationFn: DocumentsApi.upload.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DocumentsApi.list.key() })
      toast.success('Document added to knowledge base')
    },
    onError: () => toast.error('Upload failed'),
  })

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">Loading…</div>
  )
  if (!isLoggedIn) return <LoginPage />

  if (!connected) return (
    <>
      <LandingView
        error={error}
        onConnect={connect}
        onOpenSettings={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, panel: 'settings' }) })}
        onOpenHistory={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, panel: 'history' }) })}
        onLogout={() => logoutMutation.mutate()}
      />
      {panel === 'settings' && <SettingsPanel onClose={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, panel: undefined }) })} />}
      {panel === 'history'  && <HistoryPanel  onClose={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, panel: undefined }) })} />}
    </>
  )

  return (
    <ConnectedView
      voiceMode={voiceMode}
      muted={muted}
      agentSpeaking={agentSpeaking}
      agentThinking={agentThinking}
      userSpeaking={userSpeaking}
      transcript={transcript}
      ragMeta={ragMeta}
      error={error}
      isUploadPending={uploadMutation.isPending}
      settingsOpen={panel === 'settings'}
      onDisconnect={disconnect}
      onToggleMute={toggleMute}
      onToggleVoiceMode={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, view: voiceMode ? 'transcript' : 'voice' }) })}
      onCloseSettings={() => navigate({ search: (prev: RouteSearch) => ({ ...prev, panel: undefined }) })}
      onFileSelected={file => uploadMutation.mutate(file)}
    />
  )
}
