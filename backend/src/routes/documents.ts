import { Router, Request, Response } from 'express'
import multer from 'multer'
import { ingestDocument, listDocuments, deleteDocument } from '../lib/kb.js'

export const documentsRouter = Router()

const TWO_MB = 2 * 1024 * 1024
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TWO_MB },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain']
    cb(null, allowed.includes(file.mimetype))
  },
})

documentsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await listDocuments()
    res.json(docs)
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})

documentsRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ detail: 'No file uploaded. Only PDF and TXT files under 2 MB are accepted.' })
      return
    }
    const doc = await ingestDocument(req.file.buffer, req.file.originalname)
    res.json(doc)
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('LIMIT_FILE_SIZE')) {
      res.status(413).json({ detail: 'File too large. Maximum size is 2 MB.' })
      return
    }
    res.status(500).json({ detail: message })
  }
})

documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteDocument(req.params['id'] as string)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ detail: (err as Error).message })
  }
})
