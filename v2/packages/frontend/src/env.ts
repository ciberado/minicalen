const isDev = import.meta.env.DEV;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (!isDev && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3001';
}

function resolveCollabUrl(): string {
  const configured = import.meta.env.VITE_COLLAB_URL;

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (!isDev && typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/collaboration`;
  }

  return 'ws://localhost:3002';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const COLLAB_URL = resolveCollabUrl();
