import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  forgetSessionToken,
  loadSessionToken,
  saveSessionToken,
} from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('session token storage', () => {
  it('saves, loads and forgets tokens', () => {
    saveSessionToken('s1', 'token-1');
    expect(loadSessionToken('s1')).toBe('token-1');

    forgetSessionToken('s1');
    expect(loadSessionToken('s1')).toBeNull();
  });
});

describe('api client', () => {
  it('stores the token returned when creating an anonymous session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ session: { id: 's1' }, token: 'anon-token' }, 201)),
    );

    await api.createSession('Test');

    expect(loadSessionToken('s1')).toBe('anon-token');
  });

  it('attaches the anonymous token to session requests', async () => {
    saveSessionToken('s1', 'anon-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ session: { id: 's1' }, accessLevel: 'owner' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.getSession('s1');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer anon-token');
    expect(init.credentials).toBe('include');
  });

  it('throws an ApiError with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Session not found' }, 404)),
    );

    await expect(api.getSession('missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Session not found',
    });
  });
});
