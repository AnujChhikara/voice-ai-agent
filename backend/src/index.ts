import './instrumentation.js'
import 'dotenv/config'
import { logger } from './lib/logger.js'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { authRouter } from './routes/auth.js'
import { documentsRouter } from './routes/documents.js'
import { promptRouter } from './routes/prompt.js'
import { tokenRouter } from './routes/token.js'
import { requireAuth } from './middleware/auth.js'

if (process.env.NODE_ENV === "production" && process.env.SKIP_AUTH === "true") {
  throw new Error("SKIP_AUTH must not be enabled in production")
}

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
}))

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'voice-ai-backend' }))

app.use('/api/auth', authRouter)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/documents', requireAuth, documentsRouter)
app.use('/api/prompt', requireAuth, promptRouter)
app.use('/api/token', requireAuth, tokenRouter)

const PORT = process.env.PORT || 8000
app.listen(PORT, () => logger.info({ port: PORT }, 'Backend running'))
