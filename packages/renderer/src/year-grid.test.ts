import { afterEach, describe, expect, it } from 'vitest';
import type { Category } from '@minicalen/shared';
import { INK_DARK, INK_LIGHT, contrastInk, hexToRgba } from './color';
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

describe('contrastInk', () => {
  it('picks dark ink for light colors', () => {
    expect(contrastInk('#F44336')).toBe(INK_DARK);
    expect(contrastInk('#2196F3')).toBe(INK_DARK);
    expect(contrastInk('#4CAF50')).toBe(INK_DARK);
    expect(contrastInk('#ffffff')).toBe(INK_DARK);
  });

  it('picks light ink for dark colors', () => {
    expect(contrastInk('#795548')).toBe(INK_LIGHT);
    expect(contrastInk('#9C27B0')).toBe(INK_LIGHT);
    expect(contrastInk('#000000')).toBe(INK_LIGHT);
  });
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

  it('renders a subset of months from startMonth', async () => {
    const element = await mount({ startMonth: 4, monthCount: 2 });

    const names = Array.from(element.shadowRoot?.querySelectorAll('.month-name') ?? []).map(
      (node) => node.textContent?.trim(),
    );
    expect(names).toEqual(['May', 'June']);
  });

  it('clamps the month range to the end of the year', async () => {
    const element = await mount({ startMonth: 11, monthCount: 2 });
    expect(element.shadowRoot?.querySelectorAll('.month')).toHaveLength(1);
    expect(element.shadowRoot?.querySelector('.month-name')?.textContent?.trim()).toBe('December');
  });

  it('clamps startMonth into the valid range', async () => {
    const element = await mount({ startMonth: 42, monthCount: 2 });
    expect(element.shadowRoot?.querySelector('.month-name')?.textContent?.trim()).toBe('December');
  });

  it('applies explicit columns as an inline grid template', async () => {
    const element = await mount({ startMonth: 0, monthCount: 2, columns: 1 });
    const months = element.shadowRoot?.querySelector('.months') as HTMLElement;
    expect(months.getAttribute('style')).toContain('repeat(1');
    expect(months.classList.contains('auto')).toBe(false);
  });

  it('keeps responsive auto layout when columns is not set', async () => {
    const element = await mount();
    const months = element.shadowRoot?.querySelector('.months') as HTMLElement;
    expect(months.classList.contains('auto')).toBe(true);
    expect(months.getAttribute('style') ?? '').toBe('');
  });

  it('emits date-click for a date inside the paged range', async () => {
    const element = await mount({
      categories: [foreground],
      selectedCategoryId: 'fg',
      startMonth: 2,
      monthCount: 2,
    });
    const events: string[] = [];
    element.addEventListener('date-click', (event) => {
      events.push((event as CustomEvent<{ date: string }>).detail.date);
    });

    day(element, '2026-03-10').click();
    expect(events).toEqual(['2026-03-10']);
  });

  it('renders day cells with date keys', async () => {
    const element = await mount();

    expect(day(element, '2026-01-01')).toBeDefined();
    expect(day(element, '2026-01-31')).toBeDefined();
    expect(day(element, '2026-02-01')).toBeDefined();
  });

  it('applies a single foreground category with contrasting ink', async () => {
    const element = await mount({
      categories: [foreground],
      dateMarks: { '2026-01-15': { categoryIds: ['fg'], textCategoryIds: [] } },
    });

    const cell = day(element, '2026-01-15');
    expect(cell.className).toContain('marked');
    expect(cell.getAttribute('style')).toContain('#2196F3');
    expect(cell.querySelector('.number')?.getAttribute('style')).toContain(INK_DARK);
  });

  it('uses light ink on dark categories', async () => {
    const element = await mount({
      categories: [dark],
      dateMarks: { '2026-01-15': { categoryIds: ['dark'], textCategoryIds: [] } },
    });

    expect(day(element, '2026-01-15').querySelector('.number')?.getAttribute('style')).toContain(
      INK_LIGHT,
    );
  });

  it('splits the cell diagonally for two categories', async () => {
    const element = await mount({
      categories: [foreground, dark],
      dateMarks: { '2026-01-15': { categoryIds: ['dark', 'fg'], textCategoryIds: [] } },
    });

    const style = day(element, '2026-01-15').getAttribute('style') ?? '';
    expect(style).toContain('linear-gradient(to bottom right');
    expect(style).toContain('#2196F3');
    expect(style).toContain('#795548');
  });

  it('places the lower-order category first (same half regardless of insertion order)', async () => {
    const element = await mount({
      categories: [foreground, dark],
      dateMarks: {
        '2026-01-15': { categoryIds: ['dark', 'fg'], textCategoryIds: [] },
        '2026-01-16': { categoryIds: ['fg', 'dark'], textCategoryIds: [] },
      },
    });

    const first = day(element, '2026-01-15').getAttribute('style') ?? '';
    const second = day(element, '2026-01-16').getAttribute('style') ?? '';

    expect(first).toContain('linear-gradient(to bottom right, #2196F3 0 50%, #795548 50% 100%)');
    expect(second).toContain('linear-gradient(to bottom right, #2196F3 0 50%, #795548 50% 100%)');
  });

  it('uses the primary category ink for two categories', async () => {
    const element = await mount({
      categories: [foreground, dark],
      dateMarks: { '2026-01-15': { categoryIds: ['fg', 'dark'], textCategoryIds: [] } },
    });

    expect(day(element, '2026-01-15').querySelector('.number')?.getAttribute('style')).toContain(
      INK_DARK,
    );
  });

  it('reduces opacity for hidden categories', async () => {
    const element = await mount({
      categories: [{ ...foreground, visible: false }],
      dateMarks: { '2026-01-15': { categoryIds: ['fg'], textCategoryIds: [] } },
    });

    expect(day(element, '2026-01-15').getAttribute('style')).toContain('rgba');
  });

  it('renders text symbols for text categories', async () => {
    const element = await mount({
      categories: [text],
      dateMarks: { '2026-01-15': { categoryIds: [], textCategoryIds: ['tx'] } },
    });

    expect(day(element, '2026-01-15').querySelector('.symbol')?.textContent).toBe('H');
  });

  it('stacks the day number above its text symbols', async () => {
    const element = await mount({
      categories: [foreground, text],
      dateMarks: { '2026-01-15': { categoryIds: ['fg'], textCategoryIds: ['tx'] } },
    });

    const cell = day(element, '2026-01-15');
    const number = cell.querySelector('.number');
    const symbols = cell.querySelector('.symbols');

    expect(number).not.toBeNull();
    expect(symbols).not.toBeNull();
    expect(symbols?.previousElementSibling).toBe(number);
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
