import { useState, useEffect, useRef, useCallback } from 'react'
import { ParticleSphere } from '@/components/ParticleSphere'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mic, MicOff, PhoneOff, Plus, X, Trash2, Loader2, List, Radio, Clock, ChevronDown, ChevronUp, Headphones, Sparkles, BotMessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAgent, getSessions, type CallSession } from '@/hooks/useAgent'
import { DocumentsApi } from '@/api/documents/documents.api'
import { PromptApi } from '@/api/prompt/prompt.api'
import { LoginPage } from '@/modules/login'

const queryClient = new QueryClient()

function AuthSuccess() {
  useEffect(() => { window.location.replace('/') }, [])
  return null
}

function DropZone({ onFile, isPending, message }: {
  onFile: (f: File) => void
  isPending: boolean
  message: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [staged, setStaged] = useState<File | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setStaged(file)
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setStaged(file)
  }, [])

  const handleUpload = useCallback(() => {
    if (staged) { onFile(staged); setStaged(null) }
  }, [staged, onFile])

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !staged && inputRef.current?.click()}
        className={`w-full rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 py-5 px-4 text-center select-none ${dragging ? 'border-zinc-500 bg-white/5' : 'border-zinc-800'}`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleChange} />
        {isPending ? (
          <><Loader2 size={16} className="animate-spin text-zinc-500" /><span className="text-xs text-zinc-500">Uploading…</span></>
        ) : staged ? (
          <><span className="text-xs text-zinc-300 truncate max-w-full">{staged.name}</span>
          <span className="text-[10px] text-zinc-400">{(staged.size / 1024).toFixed(0)} KB</span></>
        ) : (
          <><span className="text-xs text-zinc-400">Drag a PDF or TXT here</span>
          <span className="text-[10px] text-zinc-500">or click to browse · max 2 MB</span></>
        )}
      </div>

      {message && (
        <p className={`text-[11px] ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}

      {staged && !isPending && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-green-950 border border-green-500/25 text-green-500 hover:bg-green-500/10 transition-all cursor-pointer"
          >
            Upload
          </button>
          <button
            onClick={() => setStaged(null)}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-all cursor-pointer bg-transparent"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const { data: promptData } = useQuery({ queryKey: PromptApi.get.key(), queryFn: PromptApi.get.fn })
  useEffect(() => { if (promptData?.prompt) setPrompt(promptData.prompt) }, [promptData?.prompt])
  const { data: docs = [] } = useQuery({ queryKey: DocumentsApi.list.key(), queryFn: DocumentsApi.list.fn })

  const saveMutation = useMutation({
    mutationFn: PromptApi.set.fn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: PromptApi.get.key() }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })
  const uploadMutation = useMutation({
    mutationFn: DocumentsApi.upload.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DocumentsApi.list.key() })
      setUploadMsg('Uploaded successfully')
      setTimeout(() => setUploadMsg(''), 3000)
    },
    onError: (err: Error) => {
      setUploadMsg(err.message.includes('413') ? 'File too large (max 2 MB)' : 'Upload failed')
      setTimeout(() => setUploadMsg(''), 3000)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: DocumentsApi.delete.fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: DocumentsApi.list.key() }),
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="font-medium text-sm">Settings</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <div className="text-xs text-zinc-400 font-medium mb-2 uppercase tracking-wider">System Prompt</div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={7}
              placeholder="You are a helpful voice assistant..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-zinc-100 resize-none outline-none focus:border-zinc-700 transition-colors leading-relaxed"
            />
            <button
              onClick={() => saveMutation.mutate({ prompt })}
              className="mt-2 px-4 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-all"
              style={{
                background: saved ? 'transparent' : '#22c55e22',
                borderColor: '#22c55e',
                color: '#22c55e',
              }}
            >
              {saved ? '✓ Saved' : saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div>
            <div className="text-xs text-zinc-400 font-medium mb-3 uppercase tracking-wider">Knowledge Base</div>
            <DropZone
              onFile={f => uploadMutation.mutate(f)}
              isPending={uploadMutation.isPending}
              message={uploadMsg}
            />

            <div className="mt-3 space-y-1.5">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md">
                  <span className="text-xs text-zinc-300 truncate flex-1">{doc.filename}</span>
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="ml-2 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none p-1 flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {docs.length === 0 && <p className="text-xs text-zinc-500 py-1">No documents uploaded yet</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<CallSession[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { setSessions(getSessions()) }, [])

  function clearHistory() {
    sessionStorage.removeItem('voiceai_sessions')
    setSessions([])
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-[380px] bg-zinc-900 border-r border-zinc-800 z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="font-medium text-sm">Call History</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">No calls yet this session</p>
          ) : sessions.map(s => {
            const date = new Date(s.startedAt)
            const duration = Math.round((s.endedAt - s.startedAt) / 1000)
            const isOpen = expanded === s.id
            return (
              <div key={s.id} className="border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950 hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <p className="text-xs text-zinc-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{s.transcript.length} messages · {duration}s</p>
                  </div>
                  {isOpen ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 py-3 space-y-2 bg-zinc-950 max-h-64 overflow-y-auto">
                    {s.transcript.map((line, i) => (
                      <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {line.role === 'agent' ? (
                          <p className="max-w-[85%] text-[11px] text-zinc-400 leading-relaxed">{line.text}</p>
                        ) : (
                          <div className="max-w-[85%] px-3 py-1.5 rounded-xl bg-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
                            {line.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sessions.length > 0 && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={clearHistory}
              className="w-full py-2 text-xs text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-lg transition-all cursor-pointer bg-transparent"
            >
              Clear history
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function VoiceApp() {
  const { isLoading, isLoggedIn, logoutMutation } = useAuth()
  const { connected, muted, transcript, error, connect, disconnect, toggleMute, userSpeaking, agentSpeaking, agentThinking, ragMeta } = useAgent()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [voiceMode, setVoiceMode] = useState(true)
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [transcript])

  useEffect(() => { if (connected) setVoiceMode(true) }, [connected])

  const uploadMutation = useMutation({
    mutationFn: DocumentsApi.upload.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DocumentsApi.list.key() })
      setToast('Document added to knowledge base')
      setTimeout(() => setToast(''), 3000)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: () => { setToast('Upload failed'); setTimeout(() => setToast(''), 3000) },
  })

  if (window.location.pathname === '/auth/success') return <AuthSuccess />
  if (window.location.pathname === '/login') return <LoginPage />
  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">Loading…</div>
  )
  if (!isLoggedIn) return <LoginPage />

  function statusText() {
    if (!connected) return 'Press mic to start'
    if (muted) return 'Muted'
    if (agentSpeaking) return 'Agent speaking'
    if (agentThinking) return 'Thinking…'
    if (userSpeaking) return 'Listening'
    return 'Connected'
  }

  const sharedStyles = (
    <style>{`
      @keyframes blink { 0%,80%,100%{opacity:0.1} 40%{opacity:0.7} }
      @keyframes wave { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
    `}</style>
  )

  const fileInput = (
    <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden"
      onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f) }} />
  )

  const inputBar = (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
      <button onClick={() => fileInputRef.current?.click()} title="Add document"
        className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 transition-all flex-shrink-0 cursor-pointer bg-transparent">
        {uploadMutation.isPending ? <Loader2 size={13} className="animate-spin text-zinc-500" /> : <Plus size={14} />}
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 min-w-0 select-none">
        {connected ? (
          <span className="text-xs text-zinc-400 transition-colors duration-300">{statusText()}</span>
        ) : (
          <span className="text-sm text-zinc-700">Ask me anything…</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {connected && (
          <>
            <button
              onClick={() => setVoiceMode(v => !v)}
              title={voiceMode ? 'Switch to transcript view' : 'Switch to voice orb'}
              className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all cursor-pointer bg-transparent"
            >
              {voiceMode ? <List size={13} /> : <Radio size={13} />}
            </button>
            <button onClick={disconnect} title="End call"
              className="w-8 h-8 rounded-full border border-red-950 flex items-center justify-center text-red-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent">
              <PhoneOff size={13} />
            </button>
          </>
        )}
        <button
          onClick={() => !connected ? connect() : toggleMute()}
          title={!connected ? 'Start call' : muted ? 'Unmute' : 'Mute'}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            background: !connected ? '#e8e8e8' : muted ? '#ef444418' : '#e8e8e808',
            color: !connected ? '#0c0c0c' : muted ? '#ef4444' : '#aaa',
            border: connected ? `1px solid ${muted ? '#ef444455' : '#3f3f46'}` : 'none',
          }}
        >
          {muted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
      </div>
    </div>
  )

  if (!connected) return (
    <div className="h-screen flex flex-col bg-[#070707] text-stone-100 overflow-hidden relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 flex-shrink-0 animate-fade-up">
        <span className="font-syne font-bold text-sm tracking-[0.12em] text-[#e8b84b] uppercase select-none">
          Auris
        </span>
        <div className="flex items-center gap-4">
          <button onClick={() => setHistoryOpen(true)} title="Call history"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#e8b84b] transition-colors duration-200 cursor-pointer bg-transparent border-none p-1">
            <Clock size={14} /><span className="text-[11px] tracking-wide">History</span>
          </button>
          <button onClick={() => setSettingsOpen(true)} title="Configure agent"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#e8b84b] transition-colors duration-200 cursor-pointer bg-transparent border-none p-1">
            <BotMessageSquare size={15} /><span className="text-[11px] tracking-wide">Agent</span>
          </button>
          <button onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer px-3 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 bg-transparent">
            <LogOut size={12} />Sign out
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col pl-12 pr-8 pt-12 pb-8 w-full">
        {/* Display headline */}
        <div className="mb-8">
          <div className="animate-fade-up delay-100">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-5 h-px bg-[#e8b84b]" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#e8b84b] font-medium">Voice Intelligence</span>
            </div>
            <h1 className="font-syne font-800 leading-[0.92] select-none" style={{ fontSize: 'clamp(56px, 9vw, 108px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0ede8' }}>
              TALK TO YOUR<br />
              <span style={{ color: '#888', WebkitTextStroke: '1px #aaa' }}>BUSINESS</span><br />
              INTELLIGENCE.
            </h1>
          </div>
          <p className="animate-fade-up delay-200 mt-6 text-sm text-zinc-400 max-w-sm leading-relaxed" style={{ fontWeight: 300 }}>
          </p>
        </div>

        {/* Mic + tags row — left aligned, horizontal */}
        <div className="animate-fade-up delay-300 flex items-center gap-10 flex-wrap">

          {/* Mic button + label stacked */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span className="absolute w-24 h-24 rounded-full border border-white/5"
                style={{ animation: 'pulse-ring 3s ease-in-out infinite' }} />
              <span className="absolute w-[72px] h-[72px] rounded-full border border-white/10"
                style={{ animation: 'pulse-ring 3s ease-in-out 0.6s infinite' }} />
              <button
                onClick={connect}
                title="Start voice session"
                className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              >
                <Headphones size={22} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-zinc-200 font-light tracking-wide">Start conversation with the agent</span>
              <span className="text-[11px] text-zinc-600 tracking-[0.1em] uppercase">Click to begin</span>
            </div>
          </div>

          {/* Divider */}
          <span className="h-10 w-px bg-zinc-800 hidden sm:block" />

          {/* Capability tags */}
          <div className="animate-fade-up delay-400 flex flex-col gap-3">
            <span className="text-[9px] tracking-[0.25em] uppercase text-zinc-600 font-medium flex items-center gap-1.5">
              <Sparkles size={8} className="text-[#e8b84b]" />What it does
            </span>
            <div className="flex flex-wrap gap-2">
              {['Document Q&A', 'Real-time Voice', 'Custom Agent', 'RAG Retrieval', 'GPT-4o'].map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full text-[11px] text-zinc-500 border border-zinc-800 bg-zinc-950 select-none">
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>

        {error && (
          <p className="mt-6 animate-fade-up text-xs text-red-500 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Tech stack */}
        <div className="animate-fade-up delay-500 mt-auto pt-8">
          <div className="flex items-center gap-3">
            <span className="w-4 h-px bg-zinc-600" />
            <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-300">
              LiveKit · OpenAI GPT-4o · Deepgram Nova · ChromaDB
            </span>
          </div>
        </div>
      </div>

      {/* Decorative vertical label */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3 select-none pointer-events-none animate-fade-up delay-600">
        <span className="text-[9px] tracking-[0.3em] uppercase text-zinc-800 font-syne"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Voice AI Agent
        </span>
        <span className="w-px h-16 bg-zinc-900" />
      </div>

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-full text-xs text-zinc-400 z-30">
          {toast}
        </div>
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
      {fileInput}
      {sharedStyles}
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-[#070707] text-stone-100">

      {voiceMode ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 relative">
          <ParticleSphere speaking={agentSpeaking || userSpeaking} thinking={agentThinking} size={220} />

          <div className="flex flex-col items-center gap-3 max-w-md w-full">
            {/* Thinking dots only */}
            {agentThinking && !agentSpeaking && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                      style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span className="text-[11px] text-zinc-600 tracking-wide">Agent is thinking…</span>
              </div>
            )}

            {/* placeholder to keep layout stable — text removed, use transcript view */}
            {userSpeaking && !agentSpeaking && (() => {
              const lastUser = [...transcript].reverse().find(t => t.role === 'user')
              if (!lastUser) return null
              return (
                <p className="text-[11px] text-zinc-500 text-center italic">"{lastUser.text}"</p>
              )
            })()}
          </div>

          {ragMeta && ragMeta.sources.length > 0 && (
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sources used</p>
                {ragMeta && <span className="text-[10px] text-zinc-600">{ragMeta.retrieved} of {ragMeta.total} chunks · <span className="text-[#e8b84b]">{Math.round((1 - ragMeta.retrieved / ragMeta.total) * 100)}% filtered</span></span>}
              </div>
              <div className="space-y-1">
                {[...new Map(ragMeta!.sources.map(s => [s.document, s])).values()].map(src => (
                  <div key={src.id} className="px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-lg">
                    <p className="text-[11px] text-zinc-400 font-medium truncate">{src.document}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{src.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-3 max-w-xl w-full mx-auto">
          {transcript.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-zinc-700">Start speaking…</p>
            </div>
          ) : transcript.map((line, i) => (
            <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {line.role === 'agent' ? (
                <p className="max-w-[80%] text-sm text-zinc-400 leading-relaxed">{line.text}</p>
              ) : (
                <div className="max-w-[72%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-zinc-800 text-sm text-zinc-200 leading-relaxed">
                  {line.text}
                </div>
              )}
            </div>
          ))}
          {agentThinking && (
            <div className="flex justify-start gap-1.5 py-1 pl-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-zinc-700" style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
          {ragMeta && ragMeta.sources.length > 0 && (
            <div className="mt-2 pt-3 border-t border-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sources used</p>
                {ragMeta && <span className="text-[10px] text-zinc-600">{ragMeta.retrieved} of {ragMeta.total} chunks · <span className="text-[#e8b84b]">{Math.round((1 - ragMeta.retrieved / ragMeta.total) * 100)}% filtered</span></span>}
              </div>
              <div className="space-y-1">
                {[...new Map(ragMeta!.sources.map(s => [s.document, s])).values()].map(src => (
                  <div key={src.id} className="px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-lg">
                    <p className="text-[11px] text-zinc-400 font-medium truncate">{src.document}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{src.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <div ref={bottomRef} />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 z-30">
          {toast}
        </div>
      )}

      <div className="px-5 py-4 border-t border-zinc-900 flex-shrink-0">
        <div className="max-w-xl mx-auto">
          {fileInput}
          {inputBar}
        </div>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {sharedStyles}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VoiceApp />
    </QueryClientProvider>
  )
}
