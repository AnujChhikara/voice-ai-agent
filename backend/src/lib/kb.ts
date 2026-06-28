import OpenAI from 'openai'
import { ChromaClient, Collection } from 'chromadb'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const chromaUrl = new URL(process.env.CHROMA_URL || 'http://localhost:8001')
const chroma = new ChromaClient({
  ssl: chromaUrl.protocol === 'https:',
  host: chromaUrl.hostname,
  port: parseInt(chromaUrl.port) || (chromaUrl.protocol === 'https:' ? 443 : 8001),
})

const COLLECTION_NAME = 'knowledge_base'
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 150

type ChunkMetadata = { doc_id: string; filename: string } & Record<string, string>

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').filter(l => l.trim().length > 2).join('\n')
    .trim()
}

async function getCollection(): Promise<Collection> {
  return chroma.getOrCreateCollection({ name: COLLECTION_NAME, embeddingFunction: null as never })
}

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

export async function ingestDocument(
  buffer: Buffer,
  filename: string
): Promise<{ id: string; filename: string }> {
  let text = ''
  if (filename.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buffer)
    text = parsed.text
  } else {
    text = buffer.toString('utf-8')
  }

  text = cleanText(text)

  const chunks = chunkText(text)
  if (!chunks.length) throw new Error('No content extracted from file')

  const docId = `${filename}-${Date.now()}`
  const collection = await getCollection()

  const embeddingResp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  })
  const embeddings = embeddingResp.data.map(e => e.embedding)

  await collection.add({
    ids: chunks.map((_, i) => `${docId}-chunk-${i}`),
    embeddings,
    documents: chunks,
    metadatas: chunks.map((): ChunkMetadata => ({ doc_id: docId, filename })),
  })

  return { id: docId, filename }
}

export async function listDocuments(): Promise<{ id: string; filename: string }[]> {
  const collection = await getCollection()
  const result = await collection.get({ include: ['metadatas'] })
  const seen = new Set<string>()
  const docs: { id: string; filename: string }[] = []
  for (const meta of result.metadatas || []) {
    const m = meta as unknown as ChunkMetadata
    if (!seen.has(m.doc_id)) {
      seen.add(m.doc_id)
      docs.push({ id: m.doc_id, filename: m.filename })
    }
  }
  return docs
}

export async function deleteDocument(docId: string): Promise<void> {
  const collection = await getCollection()
  const result = await collection.get({
    where: { doc_id: docId },
    include: ['metadatas'],
  })
  if (result.ids?.length) await collection.delete({ ids: result.ids })
}

export async function retrieveContext(query: string, nResults = 4): Promise<string> {
  const collection = await getCollection()
  const count = await collection.count()
  if (!count) return ''

  const embeddingResp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: [query],
  })
  const embedding = embeddingResp.data[0].embedding

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: Math.min(nResults, count),
    include: ['documents'],
  })

  return (results.documents?.[0] || []).join('\n\n')
}
