import 'dotenv/config'
import OpenAI from 'openai'
import { ChromaClient } from 'chromadb'
import { logger } from './lib/logger.js'
import { computeMaxChunks } from './utils/ragBudget.js'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const chromaServerUrl = new URL(process.env.CHROMA_URL || 'http://localhost:8001')
const chromaClient = new ChromaClient({
  ssl: chromaServerUrl.protocol === 'https:',
  host: chromaServerUrl.hostname,
  port: parseInt(chromaServerUrl.port) || (chromaServerUrl.protocol === 'https:' ? 443 : 8001),
})

const KNOWLEDGE_BASE_COLLECTION_NAME = 'knowledge_base'

// Cache the collection reference — avoids a getOrCreateCollection round trip on every user turn
let cachedKnowledgeBaseCollection: Awaited<ReturnType<typeof chromaClient.getOrCreateCollection>> | null = null

export type RagSource = {
  chunkId: string
  sourceDocument: string
  textSnippet: string
}

export type RagResult = {
  contextText: string
  sources: RagSource[]
  chunksRetrieved: number
  totalChunksInStore: number
}

type ChromaChunkMetadata = {
  filename?: string
  doc_id?: string
}

async function getKnowledgeBaseCollection() {
  if (!cachedKnowledgeBaseCollection) {
    cachedKnowledgeBaseCollection = await chromaClient.getOrCreateCollection({
      name: KNOWLEDGE_BASE_COLLECTION_NAME,
      embeddingFunction: null as never,
    })
  }
  return cachedKnowledgeBaseCollection
}

export async function retrieveContext(query: string, overrideMaxChunks?: number): Promise<RagResult | null> {
  const maxChunksToRetrieve = overrideMaxChunks ?? computeMaxChunks(query)

  try {
    const knowledgeBaseCollection = await getKnowledgeBaseCollection()
    const totalChunksInStore = await knowledgeBaseCollection.count()
    if (!totalChunksInStore) return null

    const queryEmbeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: [query],
    })
    const queryEmbedding = queryEmbeddingResponse.data[0].embedding

    const searchResults = await knowledgeBaseCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: Math.min(maxChunksToRetrieve, totalChunksInStore),
      include: ['documents', 'metadatas'],
    })

    const retrievedChunks    = searchResults.documents?.[0] || []
    const retrievedMetadatas = searchResults.metadatas?.[0] || []
    const retrievedChunkIds  = searchResults.ids?.[0] || []

    if (!retrievedChunks.length) return null

    const sources: RagSource[] = retrievedChunks.map((chunkText, index) => {
      const chunkMetadata = retrievedMetadatas[index] as ChromaChunkMetadata | null
      return {
        chunkId:        retrievedChunkIds[index] || String(index),
        sourceDocument: chunkMetadata?.filename || 'Unknown document',
        textSnippet:    (chunkText || '').slice(0, 120),
      }
    })

    return {
      contextText:        retrievedChunks.join('\n\n'),
      sources,
      chunksRetrieved:    retrievedChunks.length,
      totalChunksInStore,
    }

  } catch (err) {
    logger.error({ err }, 'RAG retrieveContext error')
    return null
  }
}
