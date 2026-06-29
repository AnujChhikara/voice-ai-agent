import './lib/tracing.js'
import 'dotenv/config'
import { logger } from './lib/logger.js'
import { defineAgent, WorkerOptions, cli, voice, llm } from '@livekit/agents'
import * as openai from '@livekit/agents-plugin-openai'
import * as deepgram from '@livekit/agents-plugin-deepgram'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { retrieveContext, RagResult } from './rag.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const PROMPT_FILE = join(__dir, '../../backend/prompt.txt')

const VOICE_RULES = `

VOICE OUTPUT RULES — FOLLOW STRICTLY:
- This is a voice interface. Responses are spoken aloud. Keep every reply to 2-3 sentences maximum.
- NEVER use markdown, bullet points, asterisks, dashes, bold, or any formatting. Plain spoken words only.
- Answer only what was asked. Do not volunteer extra information unprompted.
- If a topic has more depth, give the key point first and ask "Would you like more details?"`

const DEFAULT_INSTRUCTIONS = `You are a helpful voice AI assistant that answers questions about uploaded documents.
When relevant context from uploaded documents is provided, use it as your primary source to answer accurately.
If the question goes beyond what is in the documents, answer from your general knowledge.
${VOICE_RULES}`

function getInstructions(): string {
  try {
    if (existsSync(PROMPT_FILE)) {
      const custom = readFileSync(PROMPT_FILE, 'utf-8').trim()
      return custom + '\n' + VOICE_RULES
    }
  } catch { /* ignore */ }
  return DEFAULT_INSTRUCTIONS 
}


type LiveKitRoom = {
  name: string
  localParticipant: {
    publishData(data: Uint8Array, opts: { reliable: boolean }): Promise<void>
  }
}

class RAGAgent extends voice.Agent {
  private agentRoom: LiveKitRoom
  private processingQuery = ''

  constructor(room: LiveKitRoom) {
    super({ instructions: getInstructions() })
    this.agentRoom = room
  }

  async onUserTurnCompleted(turnCtx: llm.ChatContext, newMessage: llm.ChatMessage): Promise<void> {
    const query = (newMessage.textContent ?? '').trim()
    if (!query || query === this.processingQuery) return
    this.processingQuery = query

    try {
      const result = await this.fetchRagContext(query)
      if (result) {
        turnCtx.addMessage({
          role: 'system',
          content: `Relevant context from uploaded documents:\n\n${result.contextText}`,
        })
        logger.info({ contextLength: result.contextText.length, sourceCount: result.sources.length }, 'RAG context injected')

        // Send RAG sources to the frontend for display
        const payload = JSON.stringify({
          type: 'rag_sources',
          sources: result.sources.map(s => ({ id: s.chunkId, document: s.sourceDocument, snippet: s.textSnippet })),
          retrieved: result.chunksRetrieved,
          total: result.totalChunksInStore,
        })
        this.agentRoom.localParticipant
          .publishData(new TextEncoder().encode(payload), { reliable: true })
          .catch((err: unknown) => logger.error({ err }, 'Failed to publish RAG sources'))
      }
      await super.onUserTurnCompleted(turnCtx, newMessage)
    } finally {
      if (this.processingQuery === query) this.processingQuery = ''
    }
  }

  private async fetchRagContext(query: string): Promise<RagResult | null> {
    try {
      return await retrieveContext(query)
    } catch (err) {
      logger.error({ err }, 'RAG retrieval failed — continuing without context')
      return null
    }
  }
}

export default defineAgent({
  entry: async (ctx) => {
    try {
      await ctx.connect()
      const room = ctx.room as unknown as LiveKitRoom
      logger.info({ room: room.name }, 'Agent connected to room')

      const session = new voice.AgentSession({
        stt: new deepgram.STT({ model: 'nova-3' }),
        llm: new openai.LLM({ model: 'gpt-4o-mini' }),
        tts: new openai.TTS({ voice: 'alloy' }),
        turnHandling: {
          endpointing: {
            mode: 'dynamic',
            minDelay: 500,
            maxDelay: 2000,
          },
          interruption: {
            minDuration: 0.8,
            minWords: 2,
          },
          preemptiveGeneration: { enabled: false },
        },
      })

      await session.start({ agent: new RAGAgent(room), room: ctx.room })
      logger.info('Agent session started')

      try {
        await session.generateReply({
          instructions: 'Greet the user warmly and let them know you are ready to help. Keep it brief — one sentence.',
        })
      } catch (err) {
        logger.error({ err }, 'Greeting generateReply failed')
      }
    } catch (err) {
      logger.error({ err }, 'Agent entry crashed')
    }
  },
})

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }))
