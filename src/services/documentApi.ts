import { Model } from 'src/types';

declare const process: {
  env: {
    SERVER_URL?: string;
  };
};

const SERVER_URL = (typeof process !== 'undefined' && process.env?.SERVER_URL) || 'http://localhost:3080';

export interface DocumentInfo {
  name: string;
  updatedAt: string;
  size: number;
}

export class DocumentApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = SERVER_URL.endsWith('/') ? SERVER_URL.slice(0, -1) : SERVER_URL;
  }

  async save(name: string, content: Model): Promise<void> {
    const response = await fetch(`${this.baseUrl}/docs/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save document');
    }
  }

  async exists(name: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/docs/exists?name=${encodeURIComponent(name)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check document existence');
    }

    const data = await response.json();
    return data.exists;
  }

  async delete(name: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/docs/delete?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete document');
    }
  }

  async index(query?: string): Promise<DocumentInfo[]> {
    const url = query
      ? `${this.baseUrl}/docs/index?q=${encodeURIComponent(query)}`
      : `${this.baseUrl}/docs/index`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch document list');
    }

    return response.json();
  }

  async load(name: string): Promise<Model> {
    const response = await fetch(`${this.baseUrl}/docs/load?name=${encodeURIComponent(name)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load document');
    }

    return response.json();
  }
}

export const documentApi = new DocumentApi();