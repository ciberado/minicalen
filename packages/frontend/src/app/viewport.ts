export interface ViewportState {
  isMobile: boolean;
  isPortrait: boolean;
}

export const MOBILE_QUERY = '(pointer: coarse) and (max-width: 900px)';
export const PORTRAIT_QUERY = '(orientation: portrait)';

function queryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(query);
}

export function readViewport(): ViewportState {
  return {
    isMobile: queryList(MOBILE_QUERY)?.matches ?? false,
    isPortrait: queryList(PORTRAIT_QUERY)?.matches ?? true,
  };
}

export function subscribeViewport(listener: (state: ViewportState) => void): () => void {
  const mobile = queryList(MOBILE_QUERY);
  const portrait = queryList(PORTRAIT_QUERY);
  const emit = () => listener(readViewport());

  mobile?.addEventListener('change', emit);
  portrait?.addEventListener('change', emit);

  return () => {
    mobile?.removeEventListener('change', emit);
    portrait?.removeEventListener('change', emit);
  };
}
