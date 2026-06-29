import { Router, Request, Response } from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

export const promptRouter = Router()

const __dir = dirname(fileURLToPath(import.meta.url))
const PROMPT_FILE = join(__dir, '../../prompt.txt')

const DEFAULT_PROMPT =
  'You are a helpful voice assistant. Answer questions using the provided context from documents. Be concise since your responses will be spoken aloud.'


// TODO: Eventually need to move storing this prompt to a database
function readPrompt(): string {
  if (existsSync(PROMPT_FILE)) return readFileSync(PROMPT_FILE, 'utf-8')
  return DEFAULT_PROMPT
}

function writePrompt(text: string): void {
  writeFileSync(PROMPT_FILE, text, 'utf-8')
}

promptRouter.get('/', (_req: Request, res: Response) => {
  res.json({ prompt: readPrompt() })
})

promptRouter.post('/', (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: unknown }
  if (typeof prompt !== 'string') {
    res.status(400).json({ detail: 'prompt must be a string' })
    return
  }
  writePrompt(prompt)
  res.json({ ok: true })
})
