import * as fs from 'fs/promises'
import * as path from 'path'
import { Client } from 'ssh2'

export interface PublishConfig {
  sshHost?: string
  sshUser?: string
  sshPrivateKeyPath?: string
  sshBasePath?: string
  sshPublishUrl?: string
}

export class PublishManager {
  private config: PublishConfig

  constructor(config: PublishConfig) {
    this.config = config
  }

  isAvailable(): boolean {
    return !!(
      this.config.sshHost &&
      this.config.sshUser &&
      this.config.sshPrivateKeyPath &&
      this.config.sshBasePath &&
      this.config.sshPublishUrl
    )
  }

  getPublishUrl(filePath: string): string {
    if (!this.config.sshPublishUrl) {
      throw new Error('SSH_PUBLISH_URL not configured')
    }
    // Remove leading slash from filePath if present
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    // Ensure URL ends with slash before joining
    const baseUrl = this.config.sshPublishUrl.endsWith('/')
      ? this.config.sshPublishUrl
      : this.config.sshPublishUrl + '/'
    return baseUrl + cleanPath
  }

  async publish(filePath: string, data: Buffer, retries: number = 3): Promise<{ url: string }> {
    if (!this.isAvailable()) {
      throw new Error('SSH configuration not complete')
    }

    // Read private key
    const privateKey = await fs.readFile(this.config.sshPrivateKeyPath!, 'utf8')

    // Create full remote path
    const remotePath = path.posix.join(this.config.sshBasePath!, filePath)
    const remoteDir = path.posix.dirname(remotePath)

    const attemptUpload = (attemptNumber: number): Promise<{ url: string }> => {
      return new Promise((resolve, reject) => {
        const conn = new Client()
        let connectionTimeout: NodeJS.Timeout

        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          conn.end()
          reject(new Error('SSH connection timeout'))
        }, 30000)

        conn.on('ready', () => {
          clearTimeout(connectionTimeout)
        // First, create directory structure via SFTP
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end()
            return reject(new Error(`SFTP error: ${err.message}`))
          }

          // Create directories recursively
          const createDir = (dir: string): Promise<void> => {
            return new Promise((resolveDir, rejectDir) => {
              sftp.stat(dir, (statErr) => {
                if (statErr) {
                  // Directory doesn't exist, try to create it
                  const parentDir = path.posix.dirname(dir)
                  if (parentDir !== dir && parentDir !== '/' && parentDir !== '.') {
                    // Create parent directory first
                    createDir(parentDir)
                      .then(() => {
                        sftp.mkdir(dir, (mkdirErr: any) => {
                          if (mkdirErr && mkdirErr.code !== 4) { // Code 4 is "Failure" - might mean dir exists
                            rejectDir(mkdirErr)
                          } else {
                            resolveDir()
                          }
                        })
                      })
                      .catch(rejectDir)
                  } else {
                    // No parent to create, just create this directory
                    sftp.mkdir(dir, (mkdirErr: any) => {
                      if (mkdirErr && mkdirErr.code !== 4) {
                        rejectDir(mkdirErr)
                      } else {
                        resolveDir()
                      }
                    })
                  }
                } else {
                  // Directory exists
                  resolveDir()
                }
              })
            })
          }

          // Create directory structure and upload file
          createDir(remoteDir)
            .then(() => {
              // Upload the file
              sftp.writeFile(remotePath, data, (writeErr) => {
                if (writeErr) {
                  conn.end()
                  return reject(new Error(`Failed to upload file: ${writeErr.message}`))
                }

                // Success
                const url = this.getPublishUrl(filePath)
                conn.end()
                resolve({ url })
              })
            })
            .catch((dirErr) => {
              conn.end()
              reject(new Error(`Failed to create directory: ${dirErr.message}`))
            })
        })
        })

        conn.on('error', (err) => {
          clearTimeout(connectionTimeout)
          reject(new Error(`SSH connection error: ${err.message}`))
        })

        // Connect to SSH server
        conn.connect({
          host: this.config.sshHost,
          username: this.config.sshUser,
          privateKey: privateKey,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
          strictHostKeyChecking: false,
          hostVerifier: () => true  // Always accept host key
        } as any)
      })
    }

    // Retry logic with delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`SSH upload attempt ${attempt}/${retries} for ${filePath}`)
        const result = await attemptUpload(attempt)
        console.log(`SSH upload successful on attempt ${attempt}`)
        return result
      } catch (error: any) {
        console.error(`SSH upload attempt ${attempt} failed:`, error.message)

        if (attempt === retries) {
          // Final attempt failed
          throw new Error(`Failed to upload after ${retries} attempts: ${error.message}`)
        }

        // Wait 1 second before retry
        console.log(`Waiting 1 second before retry...`)
        await delay(1000)
      }
    }

    // This should never be reached due to the throw above, but TypeScript needs it
    throw new Error(`Failed to upload after ${retries} attempts`)
  }
}