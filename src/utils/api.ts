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
};