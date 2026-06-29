import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DropZone } from '@/components/DropZone'
import { DocumentsApi } from '@/api/documents/documents.api'
import { PromptApi } from '@/api/prompt/prompt.api'

type SettingsPanelProps = {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const queryClient = useQueryClient()
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptSaved, setPromptSaved] = useState(false)
  const [uploadStatusMessage, setUploadStatusMessage] = useState('')

  const { data: promptData } = useQuery({ queryKey: PromptApi.get.key(), queryFn: PromptApi.get.fn })
  useEffect(() => { if (promptData?.prompt) setSystemPrompt(promptData.prompt) }, [promptData?.prompt])

  const { data: uploadedDocuments = [] } = useQuery({ queryKey: DocumentsApi.list.key(), queryFn: DocumentsApi.list.fn })

  const savePromptMutation = useMutation({
    mutationFn: PromptApi.set.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PromptApi.get.key() })
      setPromptSaved(true)
      setTimeout(() => setPromptSaved(false), 2000)
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: DocumentsApi.upload.fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DocumentsApi.list.key() })
      setUploadStatusMessage('Uploaded successfully')
      setTimeout(() => setUploadStatusMessage(''), 3000)
    },
    onError: (err: Error) => {
      setUploadStatusMessage(err.message.includes('413') ? 'File too large (max 2 MB)' : 'Upload failed')
      setTimeout(() => setUploadStatusMessage(''), 3000)
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: DocumentsApi.delete.fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DocumentsApi.list.key() }),
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
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={7}
              placeholder="You are a helpful voice assistant..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-mono text-zinc-100 resize-none outline-none focus:border-zinc-700 transition-colors leading-relaxed"
            />
            <button
              onClick={() => savePromptMutation.mutate({ prompt: systemPrompt })}
              className="mt-2 px-4 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-all"
              style={{
                background: promptSaved ? 'transparent' : '#22c55e22',
                borderColor: '#22c55e',
                color: '#22c55e',
              }}
            >
              {promptSaved ? '✓ Saved' : savePromptMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div>
            <div className="text-xs text-zinc-400 font-medium mb-3 uppercase tracking-wider">Knowledge Base</div>
            <DropZone
              onFile={file => uploadDocumentMutation.mutate(file)}
              isPending={uploadDocumentMutation.isPending}
              message={uploadStatusMessage}
            />

            <div className="mt-3 space-y-1.5">
              {uploadedDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md">
                  <span className="text-xs text-zinc-300 truncate flex-1">{doc.filename}</span>
                  <button
                    onClick={() => deleteDocumentMutation.mutate(doc.id)}
                    className="ml-2 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none p-1 flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {uploadedDocuments.length === 0 && (
                <p className="text-xs text-zinc-500 py-1">No documents uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
