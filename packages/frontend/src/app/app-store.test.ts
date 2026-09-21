import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSessionHash } from './app-store';
import { MOBILE_QUERY } from './viewport';

describe('parseSessionHash', () => {
  it('returns an empty id for an empty hash', () => {
    expect(parseSessionHash('')).toEqual({ id: '', token: null });
  });

  it('parses a plain session id', () => {
    expect(parseSessionHash('#abc-123')).toEqual({ id: 'abc-123', token: null });
  });

  it('parses a magic link with a token', () => {
    expect(parseSessionHash('#abc-123?k=secret-token')).toEqual({
      id: 'abc-123',
      token: 'secret-token',
    });
  });
});

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

async function loadStore(options: { mobile?: boolean } = {}) {
  vi.resetModules();

  const registry = new Map<string, FakeMediaQueryList>();
  vi.stubGlobal('matchMedia', (query: string) => {
    if (!registry.has(query)) {
      const mql = new FakeMediaQueryList(query);
      mql.matches = query === MOBILE_QUERY ? Boolean(options.mobile) : false;
      registry.set(query, mql);
    }

    return registry.get(query)!;
  });

  const { appStore } = await import('./app-store');
  return { appStore, registry };
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('app-store viewport handling', () => {
  it('defaults to the months view on a coarse narrow viewport', async () => {
    const { appStore } = await loadStore({ mobile: true });
    expect(appStore.getState().view).toBe('months');
  });

  it('defaults to the grid view on desktop', async () => {
    const { appStore } = await loadStore({ mobile: false });
    expect(appStore.getState().view).toBe('grid');
  });

  it('reacts to viewport changes until the user picks a view', async () => {
    const { appStore, registry } = await loadStore({ mobile: false });
    const mobile = registry.get(MOBILE_QUERY)!;

    mobile.setMatches(true);
    expect(appStore.getState().view).toBe('months');

    appStore.setView('grid');
    mobile.setMatches(false);
    mobile.setMatches(true);
    expect(appStore.getState().view).toBe('grid');
  });
});

describe('app-store month pair navigation', () => {
  it('starts on the pair containing the current month', async () => {
    const { appStore } = await loadStore({ mobile: true });
    const month = new Date().getMonth();

    expect(appStore.getState().mobileMonthStart).toBe(month - (month % 2));
    expect(appStore.getState().mobileYear).toBe(new Date().getFullYear());
  });

  it('advances a pair at a time within the year', async () => {
    const { appStore } = await loadStore({ mobile: true });
    appStore.goToToday();
    const year = appStore.getState().mobileYear;

    appStore.nextMonthPair();

    expect(appStore.getState().mobileYear).toBe(year);
    expect(appStore.getState().mobileMonthStart).toBe(
      (new Date().getMonth() - (new Date().getMonth() % 2) + 2) % 12,
    );
  });

  it('rolls over to the next year after November-December', async () => {
    const { appStore } = await loadStore({ mobile: true });
    const year = appStore.getState().mobileYear;

    while (appStore.getState().mobileMonthStart !== 10) {
      appStore.nextMonthPair();
    }

    appStore.nextMonthPair();

    expect(appStore.getState().mobileMonthStart).toBe(0);
    expect(appStore.getState().mobileYear).toBe(year + 1);
  });

  it('rolls back to the previous year before January-February', async () => {
    const { appStore } = await loadStore({ mobile: true });
    const year = appStore.getState().mobileYear;

    while (appStore.getState().mobileMonthStart !== 0) {
      appStore.prevMonthPair();
    }

    appStore.prevMonthPair();

    expect(appStore.getState().mobileMonthStart).toBe(10);
    expect(appStore.getState().mobileYear).toBe(year - 1);
  });

  it('jumps back to the pair containing today', async () => {
    const { appStore } = await loadStore({ mobile: true });
    appStore.nextMonthPair();
    appStore.nextMonthPair();
    appStore.goToToday();

    const month = new Date().getMonth();
    expect(appStore.getState().mobileMonthStart).toBe(month - (month % 2));
    expect(appStore.getState().mobileYear).toBe(new Date().getFullYear());
  });
});

describe('app-store adjacent days preference', () => {
  it('defaults to showing adjacent month days', async () => {
    const { appStore } = await loadStore({ mobile: false });
    expect(appStore.getState().showAdjacentDays).toBe(true);
  });

  it('persists the preference across loads', async () => {
    const { appStore } = await loadStore({ mobile: false });

    appStore.setShowAdjacentDays(false);
    expect(appStore.getState().showAdjacentDays).toBe(false);
    expect(localStorage.getItem('minicalen-show-adjacent-days')).toBe('false');

    const { appStore: reloaded } = await loadStore({ mobile: false });
    expect(reloaded.getState().showAdjacentDays).toBe(false);
  });
});

describe('app-store year navigation', () => {
  it('moves between years and returns to the current year', async () => {
    const { appStore } = await loadStore({ mobile: false });
    const current = new Date().getFullYear();

    expect(appStore.getState().year).toBe(current);

    appStore.nextYear();
    expect(appStore.getState().year).toBe(current + 1);

    appStore.prevYear();
    appStore.prevYear();
    expect(appStore.getState().year).toBe(current - 1);

    appStore.goToCurrentYear();
    expect(appStore.getState().year).toBe(current);
  });
});

describe('app-store sidebar drawer', () => {
  it('closes after selecting a category on mobile', async () => {
    const { appStore } = await loadStore({ mobile: true });

    appStore.toggleSidebar();
    expect(appStore.getState().sidebarOpen).toBe(true);

    appStore.selectCategory('some-category');
    expect(appStore.getState().sidebarOpen).toBe(false);
    expect(appStore.getState().selectedCategoryId).toBe('some-category');
  });

  it('keeps the drawer state on desktop', async () => {
    const { appStore } = await loadStore({ mobile: false });

    appStore.toggleSidebar();
    appStore.selectCategory('some-category');
    expect(appStore.getState().sidebarOpen).toBe(true);
  });
});
