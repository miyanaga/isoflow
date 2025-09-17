export interface IconInfo {
  name: string
  updatedAt: Date
  size: number
}

export interface IconData {
  name: string
  svg: string
  updatedAt: Date
}

export interface IconManagerInterface {
  initialize(): Promise<void>
  save(name: string, svg: string): Promise<void>
  exists(name: string): Promise<boolean>
  delete(name: string): Promise<void>
  index(query?: string): Promise<IconInfo[]>
  sync(): Promise<IconData[]>
  getLastModified(): Promise<string | null>
  syncWithTimestamp(clientLastUpdated?: string): Promise<{ lastUpdated: string | null; data?: IconData[] }>
}