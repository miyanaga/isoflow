import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import * as path from 'path'
import * as http from 'http'
import { DocumentManager } from './managers/DocumentManager'
import { IconManager } from './managers/IconManager'

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(json({ limit: '10mb' }))
app.use(urlencoded({ extended: true, limit: '10mb' }))

const API_URL = process.env.API_URL || 'http://localhost:3080'
const url = new URL(API_URL)
const PORT = parseInt(url.port) || 3080
const DATA_DIR = process.env.DATA_DIR || './data'

const documentManager = new DocumentManager(DATA_DIR)
const iconManager = new IconManager(DATA_DIR)

async function initialize() {
  await documentManager.initialize()
  await iconManager.initialize()
}

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

app.post('/docs/save', asyncHandler(async (req: Request, res: Response) => {
  const { name, content } = req.body
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' })
  }

  try {
    await documentManager.save(name, content)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/docs/exists', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const exists = await documentManager.exists(String(name))
    res.json({ exists })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.delete('/docs/delete', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    await documentManager.delete(String(name))
    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Document not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
}))

app.get('/docs/index', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query

  try {
    const documents = await documentManager.index(q ? String(q) : undefined)
    res.json(documents)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/docs/load', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const content = await documentManager.load(String(name))
    res.json(content)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Document not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
}))

app.post('/icons/save', asyncHandler(async (req: Request, res: Response) => {
  const { name, svg } = req.body
  if (!name || !svg) {
    return res.status(400).json({ error: 'Name and svg are required' })
  }

  try {
    await iconManager.save(name, svg)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/icons/exists', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const exists = await iconManager.exists(String(name))
    res.json({ exists })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.delete('/icons/delete', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    await iconManager.delete(String(name))
    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Icon not found' })
    } else {
      res.status(500).json({ error: error.message })
    }
  }
}))

app.get('/icons/index', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query

  try {
    const icons = await iconManager.index(q ? String(q) : undefined)
    res.json(icons)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/icons/sync', asyncHandler(async (req: Request, res: Response) => {
  const { lastUpdated } = req.query

  try {
    const result = await iconManager.syncWithTimestamp(lastUpdated ? String(lastUpdated) : undefined)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

async function startServer() {
  try {
    await initialize()
    server.listen(PORT, () => {
      console.log(`Server running at ${API_URL}`)
      console.log(`Icons sync endpoint: GET /icons/sync`)
      console.log(`Data directory: ${path.resolve(DATA_DIR)}`)
    })

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down server...')
      server.close(() => {
        process.exit(0)
      })
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

export default app