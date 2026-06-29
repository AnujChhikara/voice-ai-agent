import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { getSessions, type CallSession } from '@/hooks/useAgent'

type HistoryPanelProps = {
  onClose: () => void
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const [callSessions, setCallSessions] = useState<CallSession[]>([])
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  useEffect(() => { setCallSessions(getSessions()) }, [])

  function clearAllHistory() {
    sessionStorage.removeItem('voiceai_sessions')
    setCallSessions([])
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
          {callSessions.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">No calls yet this session</p>
          ) : callSessions.map(session => {
            const sessionDate = new Date(session.startedAt)
            const durationSeconds = Math.round((session.endedAt - session.startedAt) / 1000)
            const isExpanded = expandedSessionId === session.id

            return (
              <div key={session.id} className="border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950 hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <p className="text-xs text-zinc-400">{sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{session.transcript.length} messages · {durationSeconds}s</p>
                  </div>
                  {isExpanded ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
                </button>
                {isExpanded && (
                  <div className="px-4 py-3 space-y-2 bg-zinc-950 max-h-64 overflow-y-auto">
                    {session.transcript.map((line, i) => (
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

        {callSessions.length > 0 && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={clearAllHistory}
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
