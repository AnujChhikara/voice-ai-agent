import { Clock, BotMessageSquare, LogOut, Headphones, Sparkles } from 'lucide-react'

type LandingViewProps = {
  error: string
  onConnect: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  onLogout: () => void
}

export function LandingView({ error, onConnect, onOpenSettings, onOpenHistory, onLogout }: LandingViewProps) {
  return (
    <div className="h-screen flex flex-col bg-[#070707] text-stone-100 overflow-hidden relative">
      <div className="flex items-center justify-between px-8 py-5 shrink-0 animate-fade-up">
        <span className="font-syne font-bold text-sm tracking-[0.12em] text-[#e8b84b] uppercase select-none">
          Auris
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenHistory}
            title="Call history"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#e8b84b] transition-colors duration-200 cursor-pointer bg-transparent border-none p-1"
          >
            <Clock size={14} /><span className="text-[11px] tracking-wide">History</span>
          </button>
          <button
            onClick={onOpenSettings}
            title="Configure agent"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-[#e8b84b] transition-colors duration-200 cursor-pointer bg-transparent border-none p-1"
          >
            <BotMessageSquare size={15} /><span className="text-[11px] tracking-wide">Agent</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[11px] tracking-wide text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer px-3 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 bg-transparent"
          >
            <LogOut size={12} />Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col pl-12 pr-8 pt-12 pb-8 w-full">
        <div className="mb-8">
          <div className="animate-fade-up delay-100">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-5 h-px bg-[#e8b84b]" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#e8b84b] font-medium">Voice Intelligence</span>
            </div>
            <h1 className="font-syne leading-[0.92] select-none" style={{ fontSize: 'clamp(36px, 5.5vw, 72px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0ede8' }}>
              TALK TO YOUR<br />
              <span style={{ color: '#888', WebkitTextStroke: '1px #aaa' }}>BUSINESS</span><br />
              INTELLIGENCE.
            </h1>
          </div>
        </div>

        <div className="animate-fade-up delay-300 flex items-center gap-10 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute w-24 h-24 rounded-full border border-white/5"
                style={{ animation: 'pulse-ring 3s ease-in-out infinite' }} />
              <span className="absolute w-18 h-18 rounded-full border border-white/10"
                style={{ animation: 'pulse-ring 3s ease-in-out 0.6s infinite' }} />
              <button
                onClick={onConnect}
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
              <span className="text-[11px] text-zinc-600 tracking-widest uppercase">Click to begin</span>
            </div>
          </div>

          <span className="h-10 w-px bg-zinc-800 hidden sm:block" />

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
            <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
            {error}
          </p>
        )}

        <div className="animate-fade-up delay-500 mt-auto pt-8">
          <div className="flex items-center gap-3">
            <span className="w-4 h-px bg-zinc-600" />
            <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-300">
              LiveKit · OpenAI GPT-4o · Deepgram Nova · ChromaDB
            </span>
          </div>
        </div>
      </div>

      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3 select-none pointer-events-none animate-fade-up delay-600">
        <span className="text-[9px] tracking-[0.3em] uppercase text-zinc-800 font-syne"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Voice AI Agent
        </span>
        <span className="w-px h-16 bg-zinc-900" />
      </div>
    </div>
  )
}
