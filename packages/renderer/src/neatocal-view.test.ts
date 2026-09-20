import { afterEach, describe, expect, it } from 'vitest';
import type { Category } from '@minicalen/shared';
import './neatocal-view';
import type { NeatocalView } from './neatocal-view';

const foreground: Category = {
  id: 'fg',
  type: 'foreground',
  label: 'Work',
  color: '#2196F3',
  order: 0,
  active: true,
  visible: true,
};

const dark: Category = {
  id: 'dark',
  type: 'foreground',
  label: 'Deep',
  color: '#795548',
  order: 1,
  active: true,
  visible: true,
};

const text: Category = {
  id: 'tx',
  type: 'text',
  label: 'Holiday',
  color: '#FF5722',
  order: 0,
  active: true,
  visible: true,
};

async function mount(props: Partial<NeatocalView> = {}): Promise<NeatocalView> {
  const element = document.createElement('neatocal-view') as NeatocalView;
  Object.assign(element, { year: 2026, categories: [], dateMarks: {}, ...props });
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('neatocal-view', () => {
  it('renders a year table', async () => {
    const element = await mount();
    expect(element.shadowRoot?.querySelectorAll('th.month-name')).toHaveLength(12);
  });

  it('renders a marked date with its color and ink', async () => {
    const element = await mount({
      categories: [foreground],
      dateMarks: { '2026-01-15': { categoryIds: ['fg'], textCategoryIds: [] } },
    });

    const cell = element.shadowRoot?.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.style.background).toBe('#2196F3');
    expect(cell?.querySelector('.date')?.getAttribute('style')).toContain('#1f2937');
  });

  it('splits two categories diagonally', async () => {
    const element = await mount({
      categories: [foreground, dark],
      dateMarks: { '2026-01-15': { categoryIds: ['dark', 'fg'], textCategoryIds: [] } },
    });

    const cell = element.shadowRoot?.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    const background = cell?.style.background ?? '';
    expect(background).toContain('linear-gradient(to bottom right');
    expect(background).toContain('#2196F3');
    expect(background).toContain('#795548');
  });

  it('renders text symbols as cell data', async () => {
    const element = await mount({
      categories: [text],
      dateMarks: { '2026-01-15': { categoryIds: [], textCategoryIds: ['tx'] } },
    });

    const cell = element.shadowRoot?.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.querySelector('.cell-data')?.textContent).toBe('H');
  });

  it('supports the default layout', async () => {
    const element = await mount({ layout: 'default' });
    expect(element.shadowRoot?.querySelectorAll('tbody tr')).toHaveLength(31);
  });
});
