import 'dotenv/config'
import OpenAI from 'openai'
import { ChromaClient } from 'chromadb'
import { logger } from './lib/logger.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const chromaUrl = new URL(process.env.CHROMA_URL || 'http://localhost:8001')
const chroma = new ChromaClient({
  ssl: chromaUrl.protocol === 'https:',
  host: chromaUrl.hostname,
  port: parseInt(chromaUrl.port) || (chromaUrl.protocol === 'https:' ? 443 : 8001),
})

const COLLECTION_NAME = 'knowledge_base'

export type RagSource = {
  id: string
  document: string
  snippet: string
}

export type RagResult = {
  context: string
  sources: RagSource[]
  retrieved: number
  total: number
}

type ChunkMetadata = {
  filename?: string
  doc_id?: string
}

async function getCollection() {
  return chroma.getOrCreateCollection({ name: COLLECTION_NAME, embeddingFunction: null as never })
}

export async function retrieveContext(query: string, nResults?: number): Promise<RagResult | null> {
  const words = query.trim().split(/\s+/).length
  const n = nResults ?? (words <= 5 ? 2 : words <= 10 ? 3 : 4)
  try {
    const collection = await getCollection()
    const count = await collection.count()
    if (!count) return null

    const embeddingResp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [query],
    })
    const embedding = embeddingResp.data[0].embedding

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: Math.min(n, count),
      include: ['documents', 'metadatas'],
    })

    const docs = results.documents?.[0] || []
    const metas = results.metadatas?.[0] || []
    const ids = results.ids?.[0] || []

    if (!docs.length) return null

    const sources: RagSource[] = docs.map((doc, i) => {
      const meta = metas[i] as ChunkMetadata | null
      return {
        id: ids[i] || String(i),
        document: meta?.filename || 'Unknown document',
        snippet: (doc || '').slice(0, 120),
      }
    })

    return { context: docs.join('\n\n'), sources, retrieved: docs.length, total: count }

  } catch (err) {
    logger.error({ err }, 'RAG retrieveContext error')
    return null
  }
}
