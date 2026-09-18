import { afterEach, describe, expect, it } from 'vitest';
import { renderYear } from './renderYear';

function host(): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderYear', () => {
  it('renders twelve month headers', () => {
    const element = host();
    renderYear(element, { year: 2026 });

    expect(element.querySelectorAll('th.month-name')).toHaveLength(12);
  });

  it('renders day cells with date keys', () => {
    const element = host();
    renderYear(element, { year: 2026 });

    expect(element.querySelector('[data-date="2026-01-01"]')).not.toBeNull();
    expect(element.querySelector('[data-date="2026-12-31"]')).not.toBeNull();
  });

  it('renders 42 aligned week rows', () => {
    const element = host();
    renderYear(element, { year: 2026, layout: 'aligned-weekdays' });

    expect(element.querySelectorAll('tbody tr')).toHaveLength(42);
  });

  it('renders 31 rows in the default layout', () => {
    const element = host();
    renderYear(element, { year: 2026, layout: 'default' });

    expect(element.querySelectorAll('tbody tr')).toHaveLength(31);
  });

  it('applies per-cell colors', () => {
    const element = host();
    renderYear(element, {
      year: 2026,
      colorCell: [{ date: '2026-01-15', color: '#123456' }],
    });

    const cell = element.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.style.background).toBe('#123456');
  });

  it('renders per-cell data', () => {
    const element = host();
    renderYear(element, { year: 2026, data: { '2026-01-15': 'H' } });

    const cell = element.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.querySelector('.cell-data')?.textContent).toBe('H');
  });

  it('supports multiple data lines per cell', () => {
    const element = host();
    renderYear(element, { year: 2026, data: { '2026-01-15': ['H', 'D'] } });

    const cell = element.querySelector<HTMLElement>('[data-date="2026-01-15"]');
    expect(cell?.querySelectorAll('.cell-data')).toHaveLength(2);
  });

  it('leaves leading blanks in the aligned layout', () => {
    const element = host();
    renderYear(element, { year: 2026, layout: 'aligned-weekdays' });

    const firstRow = element.querySelector<HTMLTableRowElement>('tbody tr');
    expect(firstRow?.children[0].getAttribute('data-date')).toBeNull();
    expect(element.querySelector('[data-date="2026-01-01"]')).not.toBeNull();
  });
});
