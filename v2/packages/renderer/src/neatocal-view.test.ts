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

  it('renders a marked date with its color', async () => {
    const element = await mount({
      categories: [foreground],
      dateMarks: { '2026-01-15': { categoryId: 'fg', textCategoryIds: [] } },
    });

    const cell = element.shadowRoot?.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.style.background).toBe('#2196F3');
  });

  it('renders text symbols as cell data', async () => {
    const element = await mount({
      categories: [text],
      dateMarks: { '2026-01-15': { textCategoryIds: ['tx'] } },
    });

    const cell = element.shadowRoot?.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.querySelector('.cell-data')?.textContent).toBe('H');
  });

  it('supports the default layout', async () => {
    const element = await mount({ layout: 'default' });
    expect(element.shadowRoot?.querySelectorAll('tbody tr')).toHaveLength(31);
  });
});
