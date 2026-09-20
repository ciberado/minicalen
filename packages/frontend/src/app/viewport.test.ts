import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_QUERY, PORTRAIT_QUERY, readViewport, subscribeViewport } from './viewport';

type ChangeListener = (event: MediaQueryListEvent) => void;

class FakeMediaQueryList {
  matches = false;
  private readonly listeners = new Set<ChangeListener>();

  constructor(readonly media: string) {}

  addEventListener(type: string, listener: ChangeListener): void {
    if (type === 'change') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: ChangeListener): void {
    if (type === 'change') {
      this.listeners.delete(listener);
    }
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;

    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function installMatchMedia(): Map<string, FakeMediaQueryList> {
  const registry = new Map<string, FakeMediaQueryList>();

  vi.stubGlobal('matchMedia', (query: string) => {
    if (!registry.has(query)) {
      registry.set(query, new FakeMediaQueryList(query));
    }

    return registry.get(query)!;
  });

  return registry;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readViewport', () => {
  it('reports desktop when nothing matches', () => {
    installMatchMedia();
    expect(readViewport()).toEqual({ isMobile: false, isPortrait: false });
  });

  it('reflects matching media queries', () => {
    const registry = installMatchMedia();
    readViewport();
    registry.get(MOBILE_QUERY)!.matches = true;
    registry.get(PORTRAIT_QUERY)!.matches = true;

    expect(readViewport()).toEqual({ isMobile: true, isPortrait: true });
  });

  it('falls back to desktop when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(readViewport()).toEqual({ isMobile: false, isPortrait: true });
  });
});

describe('subscribeViewport', () => {
  it('emits when a tracked query changes', () => {
    const registry = installMatchMedia();
    const states: Array<{ isMobile: boolean; isPortrait: boolean }> = [];
    const unsubscribe = subscribeViewport((state) => states.push(state));

    registry.get(MOBILE_QUERY)!.setMatches(true);
    registry.get(PORTRAIT_QUERY)!.setMatches(true);

    expect(states).toEqual([
      { isMobile: true, isPortrait: false },
      { isMobile: true, isPortrait: true },
    ]);

    unsubscribe();
  });

  it('stops emitting after unsubscribe', () => {
    const registry = installMatchMedia();
    const listener = vi.fn();
    const unsubscribe = subscribeViewport(listener);

    unsubscribe();
    registry.get(MOBILE_QUERY)!.setMatches(true);

    expect(listener).not.toHaveBeenCalled();
  });
});
