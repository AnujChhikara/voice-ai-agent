import { Router, Request, Response } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { config } from '../config.js'

export const tokenRouter = Router()

tokenRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { room } = req.body as { room?: unknown }
    if (!room || typeof room !== 'string') {
      res.status(400).json({ detail: 'room required' })
      return
    }

    const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
      identity: req.user.sub,
      name: req.user.name,
    })
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })

    res.json({ token: await at.toJwt(), url: config.livekitUrl })
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})
