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

const PORT = parseInt(process.env.PORT || '3000')
const DATA_DIR = process.env.DATA_DIR || './data'

// Serve static files from dist-app directory
const distPath = path.resolve(__dirname, '../../dist-app')
console.log('Serving static files from:', distPath)

// API routes come first
app.use(cors())

// Configure body parser for different content types for API routes
app.use('/api/publish', express.raw({ type: 'image/png', limit: '1gb' }))
app.use('/api', json({ limit: '1gb' }))
app.use('/api', urlencoded({ extended: true, limit: '1gb' }))

// Initialize managers
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

// API routes - all prefixed with /api
app.post('/api/docs/save', asyncHandler(async (req: Request, res: Response) => {
  console.log('[API] POST /api/docs/save - Request received')
  console.log('[API] Body:', JSON.stringify(req.body).substring(0, 200))

  const { name, content } = req.body
  if (!name || !content) {
    console.error('[API] Missing required fields - name:', !!name, 'content:', !!content)
    return res.status(400).json({ error: 'Name and content are required' })
  }

  try {
    await documentManager.save(name, content)
    console.log(`[API] Document saved successfully: ${name}`)
    res.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error saving document:', error)
    res.status(500).json({ error: error.message })
  }
}))

app.get('/api/docs/exists', asyncHandler(async (req: Request, res: Response) => {
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

app.delete('/api/docs/delete', asyncHandler(async (req: Request, res: Response) => {
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

app.get('/api/docs/index', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query

  try {
    const documents = await documentManager.index(q ? String(q) : undefined)
    res.json(documents)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/api/docs/load', asyncHandler(async (req: Request, res: Response) => {
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

app.post('/api/icons/save', asyncHandler(async (req: Request, res: Response) => {
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

app.get('/api/icons/exists', asyncHandler(async (req: Request, res: Response) => {
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

app.delete('/api/icons/delete', asyncHandler(async (req: Request, res: Response) => {
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

app.get('/api/icons/index', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query

  try {
    const icons = await iconManager.index(q ? String(q) : undefined)
    res.json(icons)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.get('/api/icons/sync', asyncHandler(async (req: Request, res: Response) => {
  const { lastUpdated } = req.query

  try {
    const result = await iconManager.syncWithTimestamp(lastUpdated ? String(lastUpdated) : undefined)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}))

app.put('/api/icons/rename', asyncHandler(async (req: Request, res: Response) => {
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

app.get('/api/publish/available', asyncHandler(async (req: Request, res: Response) => {
  res.json({ available: publishManager.isAvailable() })
}))

app.get('/api/publish/url', asyncHandler(async (req: Request, res: Response) => {
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

app.post('/api/publish', asyncHandler(async (req: Request, res: Response) => {
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

app.get('/api/freepik/search', asyncHandler(async (req: Request, res: Response) => {
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

app.post('/api/icons/download', asyncHandler(async (req: Request, res: Response) => {
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
    if (svgContent.includes('<svg')) {
      const isometricAttr = ` data-isometric="${isIsometric ? 'true' : 'false'}"`
      svgContent = svgContent.replace('<svg', `<svg${isometricAttr}`)
    }

    // Save to icons directory with automatic deduplication
    const actualName = await iconManager.saveWithDeduplication(name, svgContent)

    res.json({
      success: true,
      name: actualName,
      message: actualName !== name
        ? `Icon saved as "${actualName}" (original name already existed)`
        : 'Icon downloaded successfully'
    })
  } catch (error: any) {
    console.error('Icon download error:', error)
    res.status(500).json({ error: error.message })
  }
}))

// Serve static files
app.use(express.static(distPath))

// Catch-all route - serve index.html for client-side routing
app.use((req, res, next) => {
  // For API routes that didn't match, return 404
  if (req.path.startsWith('/api')) {
    console.error(`[API] 404 - Route not found: ${req.method} ${req.path}`)
    return res.status(404).json({ error: 'API endpoint not found' })
  }

  // For all other routes, serve index.html
  res.sendFile(path.join(distPath, 'index.html'))
})

// Global error handler (must be last, with 4 parameters)
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)

  // Return JSON error for API routes
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }

  // Return text error for non-API routes
  res.status(500).send('Internal server error')
})

async function startServer() {
  try {
    await initialize()

    return new Promise<http.Server>((resolve, reject) => {
      server.listen(PORT, () => {
        console.log(`All-in-one server running at http://localhost:${PORT}`)
        console.log(`API endpoints available at: http://localhost:${PORT}/api/*`)
        console.log(`Static files served from: ${distPath}`)
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

// Handle graceful shutdown
let isShuttingDown = false

async function shutdown() {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  console.log('\nShutting down server...')

  return new Promise<void>((resolve) => {
    server.close(() => {
      console.log('Server stopped')
      resolve()
    })
  })
}

process.on('SIGINT', async () => {
  await shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await shutdown()
  process.exit(0)
})

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}

export { app, server, startServer }