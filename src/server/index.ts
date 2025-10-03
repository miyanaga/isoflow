import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { json, urlencoded } from 'body-parser'
import * as path from 'path'
import * as http from 'http'
import * as dotenv from 'dotenv'
import { DocumentManager } from './managers/DocumentManager'
import { IconManager } from './managers/IconManager'
import { PublishManager } from './managers/PublishManager'
import { FreepikManager } from './managers/FreepikManager'

// Load environment variables
dotenv.config()

const app: express.Application = express()
const server = http.createServer(app)

app.use(cors())

// Configure body parser for different content types
app.use('/publish', express.raw({ type: 'image/png', limit: '1gb' }))
app.use(json({ limit: '1gb' }))
app.use(urlencoded({ extended: true, limit: '1gb' }))

const API_URL = process.env.API_URL || 'http://localhost:3080'
const url = new URL(API_URL)
const PORT = parseInt(url.port) || 3080
const DATA_DIR = process.env.DATA_DIR || './data'

const documentManager = new DocumentManager(DATA_DIR)
const iconManager = new IconManager(DATA_DIR)
const publishManager = new PublishManager({
  sshHost: process.env.SSH_HOST,
  sshUser: process.env.SSH_USER,
  sshPrivateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
  sshPrivateKeyBase64: process.env.SSH_PRIVATE_KEY_BASE64,
  sshBasePath: process.env.SSH_BASE_PATH,
  sshPublishUrl: process.env.SSH_PUBLISH_URL
})
const freepikManager = new FreepikManager(process.env.FREEPIK_API_KEY)

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

app.put('/icons/rename', asyncHandler(async (req: Request, res: Response) => {
  const { oldName, newName } = req.body
  if (!oldName || !newName) {
    return res.status(400).json({ error: 'Old name and new name are required' })
  }

  try {
    await iconManager.rename(oldName, newName)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/publish/available', asyncHandler(async (req: Request, res: Response) => {
  res.json({ available: publishManager.isAvailable() })
}))

app.get('/publish/url', asyncHandler(async (req: Request, res: Response) => {
  const { path: filePath } = req.query

  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' })
  }

  if (!publishManager.isAvailable()) {
    return res.status(503).json({ error: 'Publish service not configured' })
  }

  try {
    const url = publishManager.getPublishUrl(String(filePath))
    res.json({ url })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.post('/publish', asyncHandler(async (req: Request, res: Response) => {
  const { path: filePath } = req.query

  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' })
  }

  if (!publishManager.isAvailable()) {
    return res.status(503).json({ error: 'Publish service not configured' })
  }

  // Get raw body as buffer
  const rawBody = req.body

  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Body must be PNG data' })
  }

  try {
    const result = await publishManager.publish(String(filePath), rawBody)
    res.json(result)
  } catch (error: any) {
    console.error('Publish error:', error)
    res.status(500).json({ error: error.message })
  }
}))

app.get('/freepik/search', asyncHandler(async (req: Request, res: Response) => {
  const { query, per_page, page, order, shape, thumbnail_size } = req.query

  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  if (!freepikManager.isAvailable()) {
    return res.status(503).json({ error: 'Freepik API not configured' })
  }

  try {
    const options = {
      per_page: per_page ? parseInt(String(per_page)) : undefined,
      page: page ? parseInt(String(page)) : undefined,
      order: order as any,
      shape: shape as any,
      thumbnail_size: thumbnail_size ? parseInt(String(thumbnail_size)) : undefined
    }

    const result = await freepikManager.searchIcons(String(query), options)
    res.json(result)
  } catch (error: any) {
    console.error('Freepik search error:', error)
    res.status(500).json({ error: error.message })
  }
}))

app.post('/icons/download', asyncHandler(async (req: Request, res: Response) => {
  const { iconId, name, title, isIsometric } = req.body

  if (!iconId || !name) {
    return res.status(400).json({ error: 'Icon ID and name are required' })
  }

  if (!freepikManager.isAvailable()) {
    return res.status(503).json({ error: 'Freepik API not configured' })
  }

  try {
    // Download SVG from Freepik
    let svgContent = await freepikManager.downloadIconAsString(iconId)

    // Add metadata to SVG to indicate if it's isometric
    // Since this is server-side Node.js, we need to use a different approach
    // We'll add the metadata as an attribute in the SVG string
    if (svgContent.includes('<svg')) {
      const isometricAttr = ` data-isometric="${isIsometric ? 'true' : 'false'}"`
      svgContent = svgContent.replace('<svg', `<svg${isometricAttr}`)
    }

    // Save to icons directory
    await iconManager.save(name, svgContent)

    res.json({
      success: true,
      name,
      message: 'Icon downloaded successfully'
    })
  } catch (error: any) {
    console.error('Icon download error:', error)
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

    return new Promise<http.Server>((resolve, reject) => {
      server.listen(PORT, () => {
        console.log(`Server running at ${API_URL}`)
        console.log(`Icons sync endpoint: GET /icons/sync`)
        console.log(`Data directory: ${path.resolve(DATA_DIR)}`)
        resolve(server)
      })

      server.on('error', reject)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    throw error
  }
}

// Only install signal handler when running directly
if (require.main === module) {
  startServer().then(() => {
    process.on('SIGINT', () => {
      console.log('\nShutting down server...')
      server.close(() => {
        process.exit(0)
      })
    })
  }).catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

export { app, server, startServer, initialize }