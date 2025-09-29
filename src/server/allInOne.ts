import * as http from 'http'
import * as path from 'path'
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
import { startServer } from './index'

// Set API URL for the API server
process.env.API_URL = 'http://localhost:3080'
// Set SERVER_URL to use the proxy endpoint
process.env.SERVER_URL = '/api'

// Load webpack dev config
const webpackConfig = require('../../webpack/dev.config.js')

let apiServer: http.Server | null = null
let devServer: any = null
let isShuttingDown = false

async function startAllInOne() {
  console.log('Starting all-in-one server...')

  try {
    // Start API server first
    console.log('Starting API server on port 3080...')
    apiServer = await startServer()
    console.log('API server started successfully')

    // Configure webpack compiler
    const compiler = webpack(webpackConfig)

    // Create webpack dev server configuration
    const devServerConfig = {
      ...webpackConfig.devServer,
      port: 3000,
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:3080',
          pathRewrite: { '^/api': '' },
          changeOrigin: true,
          ws: true,
        }
      ],
      setupExitSignals: false, // We handle exit signals ourselves
    }

    // Start webpack dev server
    console.log('Starting webpack dev server on port 3000...')
    devServer = new WebpackDevServer(devServerConfig, compiler)

    await devServer.start()
    console.log('Webpack dev server started successfully')
    console.log('')
    console.log('All-in-one server is ready!')
    console.log('  Frontend: http://localhost:3000')
    console.log('  API proxy: http://localhost:3000/api → http://localhost:3080')
    console.log('')
    console.log('Press Ctrl+C to stop both servers')

  } catch (error) {
    console.error('Failed to start all-in-one server:', error)
    await shutdown()
    process.exit(1)
  }
}

async function shutdown() {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true

  console.log('\nShutting down all-in-one server...')

  const shutdownPromises: Promise<void>[] = []

  // Shutdown webpack dev server
  if (devServer) {
    console.log('Stopping webpack dev server...')
    shutdownPromises.push(
      devServer.stop().then(() => {
        console.log('Webpack dev server stopped')
      })
    )
  }

  // Shutdown API server
  if (apiServer) {
    console.log('Stopping API server...')
    shutdownPromises.push(
      new Promise<void>((resolve) => {
        apiServer!.close(() => {
          console.log('API server stopped')
          resolve()
        })
      })
    )
  }

  try {
    await Promise.all(shutdownPromises)
    console.log('All servers stopped successfully')
  } catch (error) {
    console.error('Error during shutdown:', error)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await shutdown()
  process.exit(0)
})

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error)
  await shutdown()
  process.exit(1)
})

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason)
  await shutdown()
  process.exit(1)
})

// Start the servers
startAllInOne()