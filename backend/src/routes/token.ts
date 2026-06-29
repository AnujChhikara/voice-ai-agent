import { Router, Request, Response } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { config } from '../config.js'

export const tokenRouter = Router()

tokenRouter.post('/', async (req: Request, res: Response) => {
  try {
    // currently user can join only one room
    const roomName = `room-${req.user.sub}`

    const accessToken = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
      identity: req.user.sub,
      name: req.user.name,
    })
    accessToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })

    res.json({ token: await accessToken.toJwt(), url: config.livekitUrl, room: roomName })
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})
