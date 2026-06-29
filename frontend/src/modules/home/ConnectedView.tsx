import { useRef } from 'react'
import { ParticleSphere } from '@/components/ParticleSphere'
import { RagSourcesPanel } from '@/components/RagSourcesPanel'
import { InputBar } from '@/components/InputBar'
import { SettingsPanel } from './SettingsPanel'
import type { TranscriptLine, RagMeta } from '@/hooks/useAgent'

type ConnectedViewProps = {
  voiceMode: boolean
  muted: boolean
  agentSpeaking: boolean
  agentThinking: boolean
  userSpeaking: boolean
  transcript: TranscriptLine[]
  ragMeta: RagMeta | null
  error: string
  isUploadPending: boolean
  settingsOpen: boolean
  onDisconnect: () => void
  onToggleMute: () => void
  onToggleVoiceMode: () => void
  onCloseSettings: () => void
  onFileSelected: (file: File) => void
}

export function ConnectedView({
  voiceMode, muted, agentSpeaking, agentThinking, userSpeaking,
  transcript, ragMeta, error, isUploadPending, settingsOpen,
  onDisconnect, onToggleMute, onToggleVoiceMode, onCloseSettings, onFileSelected,
}: ConnectedViewProps) {
  const transcriptBottomRef = useRef<HTMLDivElement>(null)

  const lastUserTranscriptLine = [...transcript].reverse().find(t => t.role === 'user')

  return (
    <div className="h-screen flex flex-col bg-[#070707] text-stone-100">
      <style>{`
        @keyframes blink { 0%,80%,100%{opacity:0.1} 40%{opacity:0.7} }
      `}</style>

      {voiceMode ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 relative">
          <ParticleSphere speaking={agentSpeaking || userSpeaking} thinking={agentThinking} size={220} />

          <div className="flex flex-col items-center gap-3 max-w-md w-full">
            {agentThinking && !agentSpeaking && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600"
                      style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span className="text-[11px] text-zinc-600 tracking-wide">Agent is thinking…</span>
              </div>
            )}

            {userSpeaking && !agentSpeaking && lastUserTranscriptLine && (
              <p className="text-[11px] text-zinc-500 text-center italic">"{lastUserTranscriptLine.text}"</p>
            )}
          </div>

          {ragMeta && ragMeta.sources.length > 0 && <RagSourcesPanel ragMeta={ragMeta} />}
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
              <RagSourcesPanel ragMeta={ragMeta} />
            </div>
          )}

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <div ref={transcriptBottomRef} />
        </div>
      )}

      <div className="px-5 py-4 border-t border-zinc-900 flex-shrink-0">
        <div className="max-w-xl mx-auto">
          <InputBar
            connected={true}
            muted={muted}
            isUploadPending={isUploadPending}
            voiceMode={voiceMode}
            agentSpeaking={agentSpeaking}
            agentThinking={agentThinking}
            userSpeaking={userSpeaking}
            onConnect={() => {}}
            onDisconnect={onDisconnect}
            onToggleMute={onToggleMute}
            onToggleVoiceMode={onToggleVoiceMode}
            onFileSelected={onFileSelected}
          />
        </div>
      </div>

      {settingsOpen && <SettingsPanel onClose={onCloseSettings} />}
    </div>
  )
}
