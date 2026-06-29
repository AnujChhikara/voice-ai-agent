import { useRef } from 'react'
import { Mic, MicOff, PhoneOff, Plus, Loader2, List, Radio } from 'lucide-react'

type InputBarProps = {
  connected: boolean
  muted: boolean
  isUploadPending: boolean
  voiceMode: boolean
  agentSpeaking: boolean
  agentThinking: boolean
  userSpeaking: boolean
  onConnect: () => void
  onDisconnect: () => void
  onToggleMute: () => void
  onToggleVoiceMode: () => void
  onFileSelected: (file: File) => void
}

function resolveStatusText(connected: boolean, muted: boolean, agentSpeaking: boolean, agentThinking: boolean, userSpeaking: boolean): string {
  if (!connected) return 'Press mic to start'
  if (muted) return 'Muted'
  if (agentSpeaking) return 'Agent speaking'
  if (agentThinking) return 'Thinking…'
  if (userSpeaking) return 'Listening'
  return 'Connected'
}

export function InputBar({ connected, muted, isUploadPending, voiceMode, agentSpeaking, agentThinking, userSpeaking, onConnect, onDisconnect, onToggleMute, onToggleVoiceMode, onFileSelected }: InputBarProps) {
  const hiddenFileInputRef = useRef<HTMLInputElement>(null)
  const statusText = resolveStatusText(connected, muted, agentSpeaking, agentThinking, userSpeaking)

  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f) }}
      />

      <button
        onClick={() => hiddenFileInputRef.current?.click()}
        title="Add document"
        className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 transition-all flex-shrink-0 cursor-pointer bg-transparent"
      >
        {isUploadPending ? <Loader2 size={13} className="animate-spin text-zinc-500" /> : <Plus size={14} />}
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 min-w-0 select-none">
        {connected ? (
          <span className="text-xs text-zinc-400 transition-colors duration-300">{statusText}</span>
        ) : (
          <span className="text-sm text-zinc-700">Ask me anything…</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {connected && (
          <>
            <button
              onClick={onToggleVoiceMode}
              title={voiceMode ? 'Switch to transcript view' : 'Switch to voice orb'}
              className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all cursor-pointer bg-transparent"
            >
              {voiceMode ? <List size={13} /> : <Radio size={13} />}
            </button>
            <button
              onClick={onDisconnect}
              title="End call"
              className="w-8 h-8 rounded-full border border-red-950 flex items-center justify-center text-red-500 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer bg-transparent"
            >
              <PhoneOff size={13} />
            </button>
          </>
        )}
        <button
          onClick={() => !connected ? onConnect() : onToggleMute()}
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
}
