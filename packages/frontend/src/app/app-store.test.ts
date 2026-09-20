import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_QUERY } from './viewport';

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
  });

  it('advances and clamps at the last pair', async () => {
    const { appStore } = await loadStore({ mobile: true });

    for (let index = 0; index < 12; index += 1) {
      appStore.nextMonthPair();
    }

    expect(appStore.getState().mobileMonthStart).toBe(10);
    expect(appStore.canGoNextMonthPair).toBe(false);

    appStore.nextMonthPair();
    expect(appStore.getState().mobileMonthStart).toBe(10);
  });

  it('goes back to the first pair and clamps', async () => {
    const { appStore } = await loadStore({ mobile: true });

    for (let index = 0; index < 12; index += 1) {
      appStore.prevMonthPair();
    }

    expect(appStore.getState().mobileMonthStart).toBe(0);
    expect(appStore.canGoPrevMonthPair).toBe(false);

    appStore.prevMonthPair();
    expect(appStore.getState().mobileMonthStart).toBe(0);
  });

  it('jumps back to the pair containing today', async () => {
    const { appStore } = await loadStore({ mobile: true });
    appStore.nextMonthPair();
    appStore.nextMonthPair();
    appStore.goToToday();

    const month = new Date().getMonth();
    expect(appStore.getState().mobileMonthStart).toBe(month - (month % 2));
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
