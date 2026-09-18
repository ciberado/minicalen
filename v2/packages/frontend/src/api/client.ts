import type { AccessLevel, SessionSnapshot } from '@minicalen/shared';
import { API_BASE_URL } from '../env';

export interface SessionMetadata {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  name: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface SessionSummary extends SessionMetadata {
  accessLevel: AccessLevel;
}

export interface PermissionEntry {
  userId: string;
  email: string;
  name: string | null;
  accessLevel: AccessLevel;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_PREFIX = 'minicalen-token-';

export function saveSessionToken(sessionId: string, token: string): void {
  localStorage.setItem(`${TOKEN_PREFIX}${sessionId}`, token);
}

export function loadSessionToken(sessionId: string): string | null {
  return localStorage.getItem(`${TOKEN_PREFIX}${sessionId}`);
}

export function forgetSessionToken(sessionId: string): void {
  localStorage.removeItem(`${TOKEN_PREFIX}${sessionId}`);
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;

    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      // ignore non-JSON error bodies
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listSessions: () => request<{ sessions: SessionSummary[] }>('/sessions'),

  createSession: async (name?: string) => {
    const result = await request<{ session: SessionMetadata; token?: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (result.token) {
      saveSessionToken(result.session.id, result.token);
    }

    return result;
  },

  getSession: (id: string) =>
    request<{ session: SessionMetadata; accessLevel: AccessLevel }>(`/sessions/${id}`, {
      token: loadSessionToken(id),
    }),

  renameSession: (id: string, name: string) =>
    request<{ session: SessionMetadata }>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
      token: loadSessionToken(id),
    }),

  deleteSession: (id: string) =>
    request<{ success: boolean }>(`/sessions/${id}`, {
      method: 'DELETE',
      token: loadSessionToken(id),
    }),

  claimSession: (id: string) =>
    request<{ session: SessionMetadata }>(`/sessions/${id}/claim`, {
      method: 'POST',
      token: loadSessionToken(id),
    }),

  shareSession: (id: string, email: string, accessLevel: Exclude<AccessLevel, 'owner'>) =>
    request<{ success: boolean }>(`/sessions/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, accessLevel }),
      token: loadSessionToken(id),
    }),

  getPermissions: (id: string) =>
    request<{ permissions: PermissionEntry[] }>(`/sessions/${id}/permissions`, {
      token: loadSessionToken(id),
    }),

  getState: (id: string) =>
    request<{ snapshot: SessionSnapshot | null }>(`/sessions/${id}/state`, {
      token: loadSessionToken(id),
    }),

  putState: (id: string, snapshot: SessionSnapshot) =>
    request<{ success: boolean }>(`/sessions/${id}/state`, {
      method: 'PUT',
      body: JSON.stringify(snapshot),
      token: loadSessionToken(id),
    }),
};
