import { Router, Request, Response } from 'express'
import { AccessToken } from 'livekit-server-sdk'

export const tokenRouter = Router()

tokenRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { room } = req.body as { room?: unknown }
    if (!room || typeof room !== 'string') {
      res.status(400).json({ detail: 'room required' })
      return
    }

    const identity = req.user.sub
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity, name: req.user.name }
    )
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })

    const token = await at.toJwt()
    res.json({ token, url: process.env.LIVEKIT_URL })
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})
