import { afterEach, describe, expect, it } from 'vitest';
import type { Category } from '@minicalen/shared';
import { hexToRgba } from './color';
import './year-grid';
import type { YearGrid } from './year-grid';

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

async function mount(props: Partial<YearGrid> = {}): Promise<YearGrid> {
  const element = document.createElement('year-grid') as YearGrid;
  Object.assign(element, { year: 2026, categories: [], dateMarks: {}, ...props });
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

function day(element: YearGrid, date: string): HTMLElement {
  const cell = element.shadowRoot?.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!cell) {
    throw new Error(`Missing day cell for ${date}`);
  }
  return cell;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hexToRgba', () => {
  it('converts hex colors to rgba', () => {
    expect(hexToRgba('#2196F3', 0.2)).toBe('rgba(33, 150, 243, 0.2)');
  });

  it('returns the input for invalid colors', () => {
    expect(hexToRgba('nope', 0.2)).toBe('nope');
  });
});

describe('year-grid', () => {
  it('renders twelve months', async () => {
    const element = await mount();
    expect(element.shadowRoot?.querySelectorAll('.month')).toHaveLength(12);
  });

  it('renders day cells with date keys', async () => {
    const element = await mount();

    expect(day(element, '2026-01-01')).toBeDefined();
    expect(day(element, '2026-01-31')).toBeDefined();
    expect(day(element, '2026-02-01')).toBeDefined();
  });

  it('applies the foreground category color to a marked date', async () => {
    const element = await mount({
      categories: [foreground],
      dateMarks: { '2026-01-15': { categoryId: 'fg', textCategoryIds: [] } },
    });

    expect(day(element, '2026-01-15').getAttribute('style')).toContain('2196F3');
    expect(day(element, '2026-01-16').getAttribute('style') ?? '').not.toContain('2196F3');
  });

  it('reduces opacity for hidden categories', async () => {
    const element = await mount({
      categories: [{ ...foreground, visible: false }],
      dateMarks: { '2026-01-15': { categoryId: 'fg', textCategoryIds: [] } },
    });

    expect(day(element, '2026-01-15').getAttribute('style')).toContain('rgba');
  });

  it('renders text symbols for text categories', async () => {
    const element = await mount({
      categories: [text],
      dateMarks: { '2026-01-15': { textCategoryIds: ['tx'] } },
    });

    expect(day(element, '2026-01-15').querySelector('.symbol')?.textContent).toBe('H');
  });

  it('emits date-click when an editable date is clicked', async () => {
    const element = await mount({ categories: [foreground], selectedCategoryId: 'fg' });
    const events: string[] = [];
    element.addEventListener('date-click', (event) => {
      events.push((event as CustomEvent<{ date: string }>).detail.date);
    });

    day(element, '2026-01-15').click();

    expect(events).toEqual(['2026-01-15']);
  });

  it('does not emit when read-only', async () => {
    const element = await mount({
      categories: [foreground],
      selectedCategoryId: 'fg',
      readOnly: true,
    });
    let clicked = false;
    element.addEventListener('date-click', () => {
      clicked = true;
    });

    day(element, '2026-01-15').click();

    expect(clicked).toBe(false);
  });

  it('does not emit for inactive categories', async () => {
    const element = await mount({
      categories: [{ ...foreground, active: false }],
      selectedCategoryId: 'fg',
    });
    let clicked = false;
    element.addEventListener('date-click', () => {
      clicked = true;
    });

    day(element, '2026-01-15').click();

    expect(clicked).toBe(false);
  });

  it('highlights today', async () => {
    const element = await mount({ year: new Date().getFullYear() });
    expect(element.shadowRoot?.querySelector('.today')).not.toBeNull();
  });
});
