import OpenAI from 'openai'
import { ChromaClient, Collection } from 'chromadb'
import { createRequire } from 'module'
import { config } from '../config.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

const openaiClient = new OpenAI({ apiKey: config.openaiApiKey })

const chromaServerUrl = new URL(config.chromaUrl)
const chromaClient = new ChromaClient({
  ssl: chromaServerUrl.protocol === 'https:',
  host: chromaServerUrl.hostname,
  port: parseInt(chromaServerUrl.port) || (chromaServerUrl.protocol === 'https:' ? 443 : 8001),
})

const KNOWLEDGE_BASE_COLLECTION_NAME = 'knowledge_base'
const CHUNK_SIZE_CHARS    = 800
const CHUNK_OVERLAP_CHARS = 150

type DocumentChunkMetadata = { doc_id: string; filename: string } & Record<string, string>

let cachedKnowledgeBaseCollection: Collection | null = null

async function getKnowledgeBaseCollection(): Promise<Collection> {
  if (!cachedKnowledgeBaseCollection) {
    cachedKnowledgeBaseCollection = await chromaClient.getOrCreateCollection({
      name: KNOWLEDGE_BASE_COLLECTION_NAME,
      embeddingFunction: null as never,
    })
  }
  return cachedKnowledgeBaseCollection
}

function stripHtmlAndNormalizeWhitespace(rawText: string): string {
  return rawText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').filter(line => line.trim().length > 2).join('\n')
    .trim()
}

function splitIntoOverlappingChunks(text: string): string[] {
  const chunks: string[] = []
  let startIndex = 0
  while (startIndex < text.length) {
    chunks.push(text.slice(startIndex, startIndex + CHUNK_SIZE_CHARS))
    startIndex += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS
  }
  return chunks
}

export async function ingestDocument(
  fileBuffer: Buffer,
  filename: string
): Promise<{ id: string; filename: string }> {
  let rawText = ''
  if (filename.toLowerCase().endsWith('.pdf')) {
    const parsedPdf = await pdfParse(fileBuffer)
    rawText = parsedPdf.text
  } else {
    rawText = fileBuffer.toString('utf-8')
  }

  const cleanedText = stripHtmlAndNormalizeWhitespace(rawText)
  const textChunks = splitIntoOverlappingChunks(cleanedText)
  if (!textChunks.length) throw new Error('No content extracted from file')

  const documentId = `${filename}-${Date.now()}`
  const knowledgeBaseCollection = await getKnowledgeBaseCollection()

  const embeddingResponse = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: textChunks,
  })
  const chunkEmbeddings = embeddingResponse.data.map(e => e.embedding)

  await knowledgeBaseCollection.add({
    ids:       textChunks.map((_, i) => `${documentId}-chunk-${i}`),
    embeddings: chunkEmbeddings,
    documents:  textChunks,
    metadatas:  textChunks.map((): DocumentChunkMetadata => ({ doc_id: documentId, filename })),
  })

  return { id: documentId, filename }
}

export async function listDocuments(): Promise<{ id: string; filename: string }[]> {
  const knowledgeBaseCollection = await getKnowledgeBaseCollection()

  // Fetch only one chunk per doc_id using a distinct-style query on metadatas.
  // ChromaDB has no native GROUP BY, so we fetch metadatas only (no embeddings/documents)
  // and deduplicate by doc_id in memory — much cheaper than fetching all chunk text.
  const allChunkMetadatas = await knowledgeBaseCollection.get({ include: ['metadatas'] })

  const seenDocIds = new Set<string>()
  const uniqueDocuments: { id: string; filename: string }[] = []

  for (const metadata of allChunkMetadatas.metadatas || []) {
    const chunkMeta = metadata as unknown as DocumentChunkMetadata
    if (!seenDocIds.has(chunkMeta.doc_id)) {
      seenDocIds.add(chunkMeta.doc_id)
      uniqueDocuments.push({ id: chunkMeta.doc_id, filename: chunkMeta.filename })
    }
  }

  return uniqueDocuments
}

export async function deleteDocument(documentId: string): Promise<void> {
  const knowledgeBaseCollection = await getKnowledgeBaseCollection()
  await knowledgeBaseCollection.delete({ where: { doc_id: documentId } })
}
