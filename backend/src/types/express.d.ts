import 'express-session'

declare global {
  namespace Express {
    interface Request {
      user: {
        sub: string
        email: string
        name: string
        picture: string
        type: string
      }
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    oauth_state?: string
  }
}
