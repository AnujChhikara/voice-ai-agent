import { useRef, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

type DropZoneProps = {
  onFile: (file: File) => void
  isPending: boolean
  message: string
}

export function DropZone({ onFile, isPending, message }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [stagedFile, setStagedFile] = useState<File | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setStagedFile(file)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setStagedFile(file)
  }, [])

  const handleUpload = useCallback(() => {
    if (stagedFile) { onFile(stagedFile); setStagedFile(null) }
  }, [stagedFile, onFile])

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !stagedFile && fileInputRef.current?.click()}
        className={`w-full rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 py-5 px-4 text-center select-none ${isDragging ? 'border-zinc-500 bg-white/5' : 'border-zinc-800'}`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileInputChange} />
        {isPending ? (
          <><Loader2 size={16} className="animate-spin text-zinc-500" /><span className="text-xs text-zinc-500">Uploading…</span></>
        ) : stagedFile ? (
          <><span className="text-xs text-zinc-300 truncate max-w-full">{stagedFile.name}</span>
          <span className="text-[10px] text-zinc-400">{(stagedFile.size / 1024).toFixed(0)} KB</span></>
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

      {stagedFile && !isPending && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-green-950 border border-green-500/25 text-green-500 hover:bg-green-500/10 transition-all cursor-pointer"
          >
            Upload
          </button>
          <button
            onClick={() => setStagedFile(null)}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-all cursor-pointer bg-transparent"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
