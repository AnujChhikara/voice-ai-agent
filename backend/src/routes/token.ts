import { Router, Request, Response } from 'express'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'
import { config } from '../config.js'

export const tokenRouter = Router()

const agentDispatch = new AgentDispatchClient(
  config.livekitUrl!,
  config.livekitApiKey,
  config.livekitApiSecret,
)

tokenRouter.post('/', async (req: Request, res: Response) => {
  try {
    const roomName = `room-${req.user.sub}`

    const accessToken = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
      identity: req.user.sub,
      name: req.user.name,
    })
    accessToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })

    // Explicitly dispatch agent to this room (required in LiveKit Agents 1.x)
    await agentDispatch.createDispatch(roomName, 'voice-ai-agent').catch(() => {
      // dispatch may fail if room doesn't exist yet — agent will auto-join on room creation
    })

    res.json({ token: await accessToken.toJwt(), url: config.livekitUrl, room: roomName })
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})
