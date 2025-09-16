import * as fs from 'fs/promises'
import * as path from 'path'
import { DocumentInfo, DocumentManagerInterface } from '../interfaces/DocumentManagerInterface'

export class DocumentManager implements DocumentManagerInterface {
  private docsDir: string

  constructor(dataDir: string) {
    this.docsDir = path.join(dataDir, 'docs')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.docsDir, { recursive: true })
  }

  private getFilePath(name: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_')
    return path.join(this.docsDir, `${safeName}.json`)
  }

  async save(name: string, content: any): Promise<void> {
    const filePath = this.getFilePath(name)
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8')
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

  async index(query?: string): Promise<DocumentInfo[]> {
    const files = await fs.readdir(this.docsDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    let filteredFiles = jsonFiles
    if (query) {
      const lowQuery = query.toLowerCase()
      filteredFiles = jsonFiles.filter(file =>
        file.toLowerCase().includes(lowQuery)
      )
    }

    const infos = await Promise.all(
      filteredFiles.map(async file => {
        const filePath = path.join(this.docsDir, file)
        const stat = await fs.stat(filePath)
        const name = file.replace(/\.json$/, '')

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

  async load(name: string): Promise<any> {
    const filePath = this.getFilePath(name)
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content)
  }
}