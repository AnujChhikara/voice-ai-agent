import { Router, Request, Response } from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { stringify } from 'querystring'
import { logger } from '../lib/logger.js'

export const authRouter = Router()

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

type UserData = {
  sub: string
  email: string
  name: string
  picture: string
}

function createAccessToken(userInfo: UserData): string {
  return jwt.sign(
    { ...userInfo, type: 'access' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '2h' }
  )
}

function createRefreshToken(userInfo: UserData): string {
  return jwt.sign(
    { ...userInfo, type: 'refresh' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  )
}

authRouter.get('/google/login', (req: Request, res: Response) => {
  const state = crypto.randomBytes(32).toString('hex')
  req.session.oauth_state = state

  const params = stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const { code, state, error } = req.query

  if (error || !code) {
    res.redirect(`${frontendUrl}/login?error=${error || 'no_code'}`)
    return
  }

  const storedState = req.session.oauth_state
  if (!storedState || storedState !== state) {
    res.redirect(`${frontendUrl}/login?error=invalid_state`)
    return
  }

  try {
    const tokenResp = await axios.post('https://oauth2.googleapis.com/token', stringify({
      code: code as string,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

    const googleTokens = tokenResp.data as { error?: string; access_token: string }
    if (googleTokens.error) {
      res.redirect(`${frontendUrl}/login?error=token_exchange_failed`)
      return
    }

    const userResp = await axios.get<{ id: string; email: string; name: string; picture: string }>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${googleTokens.access_token}` } }
    )
    const userInfo = userResp.data

    const userData: UserData = {
      sub: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    }
    const accessToken = createAccessToken(userData)
    const refreshToken = createRefreshToken(userData)

    delete req.session.oauth_state

    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 2 * 60 * 60 * 1000 })
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.redirect(`${frontendUrl}/auth/success?success=true`)
  } catch (err) {
    logger.error({ err }, 'OAuth callback error')
    res.redirect(`${frontendUrl}/login?error=auth_failed`)
  }
})

authRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => { /* ignore */ })
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
  res.json({ ok: true })
})

authRouter.get('/me', (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'production' && process.env.SKIP_AUTH === 'true') {
    res.json({ sub: 'local-user', email: 'local@dev', name: 'Local Dev', picture: '' })
    return
  }

  const token = req.cookies?.access_token as string | undefined
  if (!token) {
    res.status(401).json({ detail: 'Not authenticated' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      sub: string; email: string; name: string; picture: string
    }
    const { sub, email, name, picture } = payload
    res.json({ sub, email, name, picture })
  } catch {
    res.status(401).json({ detail: 'Invalid token' })
  }
})
