import axios from 'axios'

interface FreepikIcon {
  id: string
  name: string
  title: string
  thumbnails: Array<{
    width: number
    height: number
    url: string
  }>
  author: {
    id: string
    name: string
    username: string
  }
  set?: {
    id: string
    name: string
    slug: string
  }
  family?: {
    id: string
    name: string
  }
  style?: string | { name: string }
  tags: string[] | Array<{ name: string, slug: string }>
}

interface FreepikSearchResponse {
  data: FreepikIcon[]
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

export interface FreepikSearchOptions {
  per_page?: number
  page?: number
  order?: 'relevance' | 'recent'
  shape?: 'outline' | 'fill' | 'lineal-color' | 'hand-drawn'
  thumbnail_size?: number
}

export class FreepikManager {
  private apiKey: string
  private baseUrl = 'https://api.freepik.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FREEPIK_API_KEY || ''
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey)
  }

  async searchIcons(query: string, options: FreepikSearchOptions = {}): Promise<FreepikSearchResponse> {
    if (!this.isAvailable()) {
      throw new Error('Freepik API key not configured')
    }

    const params: any = {
      term: query,
      per_page: options.per_page || 30,
      page: options.page || 1,
      order: options.order || 'relevance',
      thumbnail_size: options.thumbnail_size || 128
    }

    if (options.shape) {
      params['filters[shape]'] = options.shape
    }

    try {
      const response = await axios.get(`${this.baseUrl}/icons`, {
        headers: {
          'x-freepik-api-key': this.apiKey
        },
        params
      })

      return response.data as FreepikSearchResponse
    } catch (error: any) {
      if (error.isAxiosError || (error.response && error.config)) {
        const status = error.response?.status
        const message = error.response?.data?.message || error.message

        switch(status) {
          case 429:
            throw new Error(`API limit exceeded: ${message}`)
          case 401:
            throw new Error(`API unauthorized: ${message}`)
          case 403:
            throw new Error(`API forbidden: ${message}`)
          default:
            throw new Error(`Freepik API error: ${message}`)
        }
      }
      throw error
    }
  }

  async getIconDownloadUrl(id: string, format: 'svg' | 'png' = 'svg'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Freepik API key not configured')
    }

    try {
      const response = await axios.get(`${this.baseUrl}/icons/${id}/download`, {
        headers: {
          'x-freepik-api-key': this.apiKey
        },
        params: {
          format
        }
      })

      const responseData = response.data as { data?: { url?: string } }
      if (responseData.data?.url) {
        return responseData.data.url
      } else {
        throw new Error('Download URL not found in response')
      }
    } catch (error: any) {
      if (error.isAxiosError || (error.response && error.config)) {
        const status = error.response?.status
        const message = error.response?.data?.message || error.message

        switch(status) {
          case 429:
            throw new Error(`API limit exceeded: ${message}`)
          case 401:
            throw new Error(`API unauthorized: ${message}`)
          case 403:
            throw new Error(`API forbidden: ${message}`)
          case 404:
            throw new Error(`Icon not found: ${message}`)
          default:
            throw new Error(`Freepik API error: ${message}`)
        }
      }
      throw error
    }
  }

  async downloadIcon(id: string): Promise<Buffer> {
    const downloadUrl = await this.getIconDownloadUrl(id, 'svg')

    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    })

    if (response.status !== 200) {
      throw new Error(`Download failed: ${response.status}`)
    }

    return Buffer.from(response.data as ArrayBuffer)
  }

  async downloadIconAsString(id: string): Promise<string> {
    const buffer = await this.downloadIcon(id)
    return buffer.toString('utf-8')
  }
}