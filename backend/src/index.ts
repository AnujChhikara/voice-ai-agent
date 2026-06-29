import './lib/tracing.js'
import { config } from './config.js'
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

if (config.isProd && config.skipAuth) {
  throw new Error("SKIP_AUTH must not be enabled in production")
}

const app = express()

app.use(cors({ origin: config.frontendUrl, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd },
}))

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'voice-ai-backend' }))

app.use('/api/auth', authRouter)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/documents', requireAuth, documentsRouter)
app.use('/api/prompt', requireAuth, promptRouter)
app.use('/api/token', requireAuth, tokenRouter)

app.listen(config.port, () => logger.info({ port: config.port }, 'Backend running'))
