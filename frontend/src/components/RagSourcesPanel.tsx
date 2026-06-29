import type { RagMeta } from '@/hooks/useAgent'

type RagSourcesPanelProps = {
  ragMeta: RagMeta
}

export function RagSourcesPanel({ ragMeta }: RagSourcesPanelProps) {
  const uniqueSourcesByDocument = [...new Map(ragMeta.sources.map(s => [s.document, s])).values()]
  const filteredPercentage = Math.round((1 - ragMeta.retrieved / ragMeta.total) * 100)

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sources used</p>
        <span className="text-[10px] text-zinc-600">
          {ragMeta.retrieved} of {ragMeta.total} chunks · <span className="text-[#e8b84b]">{filteredPercentage}% filtered</span>
        </span>
      </div>
      <div className="space-y-1">
        {uniqueSourcesByDocument.map(source => (
          <div key={source.id} className="px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-lg">
            <p className="text-[11px] text-zinc-400 font-medium truncate">{source.document}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{source.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
