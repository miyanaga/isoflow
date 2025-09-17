import * as fs from 'fs/promises'
import * as path from 'path'
import { IconInfo, IconData, IconManagerInterface } from '../interfaces/IconManagerInterface'

export class IconManager implements IconManagerInterface {
  private iconsDir: string

  constructor(dataDir: string) {
    this.iconsDir = path.join(dataDir, 'icons')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.iconsDir, { recursive: true })
  }

  private getFilePath(name: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_')
    return path.join(this.iconsDir, `${safeName}.svg`)
  }

  async save(name: string, svg: string): Promise<void> {
    const filePath = this.getFilePath(name)
    await fs.writeFile(filePath, svg, 'utf-8')
  }

  async exists(name: string): Promise<boolean> {
    const filePath = this.getFilePath(name)
    try {
      await fs.stat(filePath)
      return true
    } catch {
      return false
    }
  }

  async delete(name: string): Promise<void> {
    const filePath = this.getFilePath(name)
    await fs.unlink(filePath)
  }

  async index(query?: string): Promise<IconInfo[]> {
    const files = await fs.readdir(this.iconsDir)
    const svgFiles = files.filter(file => file.endsWith('.svg'))

    let filteredFiles = svgFiles
    if (query) {
      const lowQuery = query.toLowerCase()
      filteredFiles = svgFiles.filter(file =>
        file.toLowerCase().includes(lowQuery)
      )
    }

    const infos = await Promise.all(
      filteredFiles.map(async file => {
        const filePath = path.join(this.iconsDir, file)
        const stat = await fs.stat(filePath)
        const name = file.replace(/\.svg$/, '')

        return {
          name,
          updatedAt: stat.mtime,
          size: stat.size
        }
      })
    )

    return infos
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 100)
  }

  async sync(): Promise<IconData[]> {
    const files = await fs.readdir(this.iconsDir)
    const svgFiles = files.filter(file => file.endsWith('.svg'))

    const icons = await Promise.all(
      svgFiles.map(async file => {
        const filePath = path.join(this.iconsDir, file)
        const stat = await fs.stat(filePath)
        const svg = await fs.readFile(filePath, 'utf-8')
        const name = file.replace(/\.svg$/, '')

        return {
          name,
          svg,
          updatedAt: stat.mtime
        }
      })
    )

    return icons.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getLastModified(): Promise<string | null> {
    try {
      const files = await fs.readdir(this.iconsDir)
      const svgFiles = files.filter(file => file.endsWith('.svg'))

      if (svgFiles.length === 0) {
        return null
      }

      const stats = await Promise.all(
        svgFiles.map(async file => {
          const filePath = path.join(this.iconsDir, file)
          const stat = await fs.stat(filePath)
          return stat.mtime.getTime()
        })
      )

      return new Date(Math.max(...stats)).toISOString()
    } catch {
      return null
    }
  }

  async syncWithTimestamp(clientLastUpdated?: string): Promise<{ lastUpdated: string | null; data?: IconData[] }> {
    const serverLastUpdated = await this.getLastModified()

    // If no icons exist on server
    if (!serverLastUpdated) {
      return { lastUpdated: null, data: [] }
    }

    // If client has same timestamp as server, return empty
    if (clientLastUpdated === serverLastUpdated) {
      return { lastUpdated: serverLastUpdated }
    }

    // Otherwise return full data
    const data = await this.sync()
    return { lastUpdated: serverLastUpdated, data }
  }

  // Removed watchIcons method as we're using polling instead
}