import 'dotenv/config'

const isProd = process.env.NODE_ENV === 'production'

export const config = {
  isProd,
  skipAuth:          !isProd && process.env.SKIP_AUTH === 'true',
  port:              process.env.PORT || '8000',
  jwtSecret:         process.env.JWT_SECRET || 'dev-secret',
  sessionSecret:     process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-secret',
  frontendUrl:       process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl:        process.env.BACKEND_URL  || 'http://localhost:8000',
  googleClientId:    process.env.GOOGLE_CLIENT_ID,
  googleClientSecret:process.env.GOOGLE_CLIENT_SECRET,
  openaiApiKey:      process.env.OPENAI_API_KEY,
  chromaUrl:         process.env.CHROMA_URL || 'http://localhost:8001',
  livekitUrl:        process.env.LIVEKIT_URL,
  livekitApiKey:     process.env.LIVEKIT_API_KEY,
  livekitApiSecret:  process.env.LIVEKIT_API_SECRET,
  logLevel:          process.env.LOG_LEVEL || 'info',
  otlpEndpoint:      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
} as const
