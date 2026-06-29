import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { config } from '../config.js'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (config.skipAuth) {
    req.user = { sub: "local-user", email: "local@dev", name: "Local Dev", picture: "", type: "access" }
    next()
    return
  }

  const token = req.cookies?.access_token as string | undefined
  if (!token) {
    res.status(401).json({ detail: 'Not authenticated' })
    return
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload & {
      type: string; sub: string; email: string; name: string; picture: string
    }
    if (payload.type !== 'access') {
      res.status(401).json({ detail: 'Invalid token type' })
      return
    }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' })
  }
}
