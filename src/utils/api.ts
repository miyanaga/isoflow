/**
 * Utility functions for API communication through the webpack proxy
 */

const API_BASE = '/api';

export interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Make a request to the API server through the proxy
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query parameters
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * API client with typed methods
 */
export const api = {
  // Document endpoints
  docs: {
    save: (name: string, content: any) =>
      apiRequest('/docs/save', {
        method: 'POST',
        body: JSON.stringify({ name, content }),
      }),

    load: (name: string) =>
      apiRequest('/docs/load', {
        params: { name },
      }),

    exists: (name: string) =>
      apiRequest<{ exists: boolean }>('/docs/exists', {
        params: { name },
      }),

    delete: (name: string) =>
      apiRequest('/docs/delete', {
        method: 'DELETE',
        params: { name },
      }),

    index: (query?: string) =>
      apiRequest('/docs/index', {
        params: query ? { q: query } : undefined,
      }),
  },

  // Icon endpoints
  icons: {
    save: (name: string, svg: string) =>
      apiRequest('/icons/save', {
        method: 'POST',
        body: JSON.stringify({ name, svg }),
      }),

    exists: (name: string) =>
      apiRequest<{ exists: boolean }>('/icons/exists', {
        params: { name },
      }),

    delete: (name: string) =>
      apiRequest('/icons/delete', {
        method: 'DELETE',
        params: { name },
      }),

    index: (query?: string) =>
      apiRequest('/icons/index', {
        params: query ? { q: query } : undefined,
      }),

    sync: (lastUpdated?: string | null) =>
      apiRequest('/icons/sync', {
        params: lastUpdated ? { lastUpdated } : undefined,
      }),

    download: (iconId: string, name: string, title?: string) =>
      apiRequest<{ success: boolean; name: string; message: string }>('/icons/download', {
        method: 'POST',
        body: JSON.stringify({ iconId, name, title }),
      }),
  },

  // Publish endpoints
  publish: {
    available: () =>
      apiRequest<{ available: boolean }>('/publish/available'),

    getUrl: (path: string) =>
      apiRequest<{ url: string }>('/publish/url', {
        params: { path }
      }),

    upload: async (path: string, pngData: Blob) => {
      const response = await fetch(`/api/publish?path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png'
        },
        body: pngData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Publish error: ${response.status}`);
      }

      return response.json() as Promise<{ url: string }>;
    },
  },

  // Freepik endpoints
  freepik: {
    search: (query: string, options?: {
      per_page?: number;
      page?: number;
      order?: 'relevance' | 'recent';
      shape?: 'outline' | 'fill' | 'lineal-color' | 'hand-drawn';
      thumbnail_size?: number;
    }) => {
      const params: Record<string, string> = { query };
      if (options?.per_page) params.per_page = String(options.per_page);
      if (options?.page) params.page = String(options.page);
      if (options?.order) params.order = options.order;
      if (options?.shape) params.shape = options.shape;
      if (options?.thumbnail_size) params.thumbnail_size = String(options.thumbnail_size);

      return apiRequest<{
        data: Array<{
          id: string;
          name: string;
          title: string;
          thumbnails: Array<{
            width: number;
            height: number;
            url: string;
          }>;
          author: {
            id: string;
            name: string;
            username: string;
          };
          set?: {
            id: string;
            name: string;
            slug: string;
          };
          family?: {
            id: string;
            name: string;
          };
          style?: string | { name: string };
          tags: string[] | Array<{ name: string; slug: string }>;
        }>;
        meta: {
          pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
          };
        };
      }>('/freepik/search', { params });
    },
  },
};