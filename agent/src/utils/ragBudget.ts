const GPT4O_MINI_CONTEXT_WINDOW_TOKENS  = 128_000
const RESERVED_TOKENS_SYSTEM_PROMPT     = 500
const RESERVED_TOKENS_CONVERSATION      = 1_000
const AVERAGE_CHARS_PER_TOKEN           = 4
const AVERAGE_TOKENS_PER_CHUNK          = 200
const HARD_MAX_CHUNKS_PER_QUERY         = 10

export function computeMaxChunks(query: string): number {
  const queryTokenEstimate     = Math.ceil(query.length / AVERAGE_CHARS_PER_TOKEN)
  const availableTokens        = GPT4O_MINI_CONTEXT_WINDOW_TOKENS - RESERVED_TOKENS_SYSTEM_PROMPT - RESERVED_TOKENS_CONVERSATION - queryTokenEstimate
  const chunksFitInBudget      = Math.floor(availableTokens / AVERAGE_TOKENS_PER_CHUNK)
  return Math.min(Math.max(chunksFitInBudget, 1), HARD_MAX_CHUNKS_PER_QUERY)
}
