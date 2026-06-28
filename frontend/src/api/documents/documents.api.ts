import { apiClient } from '@/lib/api-client'
import { ENDPOINTS } from '@/lib/endpoints'
import type { TDocument, TUploadDocumentResponse } from './documents.type'

export const DocumentsApi = {
  list: {
    key: () => ['documents.list'],
    fn: async (): Promise<TDocument[]> => {
      const { data } = await apiClient.get<TDocument[]>(ENDPOINTS.documents)
      return data
    },
  },
  upload: {
    key: () => ['documents.upload'],
    fn: async (file: File): Promise<TUploadDocumentResponse> => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post<TUploadDocumentResponse>(ENDPOINTS.documents, form, {
        headers: { 'Content-Type': undefined },
      })
      return data
    },
  },
  delete: {
    key: (id: string) => ['documents.delete', id],
    fn: async (id: string): Promise<void> => {
      await apiClient.delete(`${ENDPOINTS.documents}/${id}`)
    },
  },
}
