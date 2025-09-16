export interface DocumentInfo {
  name: string
  updatedAt: Date
  size: number
}

export interface DocumentManagerInterface {
  save(name: string, content: any): Promise<void>
  exists(name: string): Promise<boolean>
  delete(name: string): Promise<void>
  index(query?: string): Promise<DocumentInfo[]>
  load(name: string): Promise<any>
}