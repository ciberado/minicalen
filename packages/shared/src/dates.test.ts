import { describe, expect, it } from 'vitest';
import {
  dateKeyFromParts,
  daysInMonth,
  mondayFirstOffset,
  monthCells,
  monthGrid,
  toDateKey,
} from './dates';

describe('toDateKey', () => {
  it('formats dates as YYYY-MM-DD with padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('daysInMonth', () => {
  it('handles month lengths and leap years', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);
  });
});

describe('mondayFirstOffset', () => {
  it('computes the leading blank cells for a Monday-first week', () => {
    expect(mondayFirstOffset(2026, 0)).toBe(3);
    expect(mondayFirstOffset(2026, 1)).toBe(6);
  });
});

describe('monthCells', () => {
  it('pads to whole weeks', () => {
    const cells = monthCells(2026, 1);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter((cell) => cell !== null)).toHaveLength(28);
  });

  it('returns nulls for leading blanks', () => {
    const cells = monthCells(2026, 0);
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toBe(1);
  });
});

describe('monthGrid', () => {
  it('fills leading and trailing cells with adjacent-month dates', () => {
    const cells = monthGrid(2026, 0);

    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toEqual({ dateKey: '2025-12-29', day: 29, monthOffset: -1 });
    expect(cells[2]).toEqual({ dateKey: '2025-12-31', day: 31, monthOffset: -1 });
    expect(cells[3]).toEqual({ dateKey: '2026-01-01', day: 1, monthOffset: 0 });

    const last = cells[cells.length - 1];
    expect(last.monthOffset).toBe(1);
    expect(last.dateKey.startsWith('2026-02')).toBe(true);
  });

  it('wraps into the next year in December', () => {
    const cells = monthGrid(2026, 11);
    const last = cells[cells.length - 1];

    expect(last.monthOffset).toBe(1);
    expect(last.dateKey.startsWith('2027-01')).toBe(true);
  });

  it('keeps monthCells as the in-month projection', () => {
    const cells = monthCells(2026, 0);
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toBe(1);
  });
});

describe('dateKeyFromParts', () => {
  it('builds a date key from parts', () => {
    expect(dateKeyFromParts(2026, 4, 1)).toBe('2026-05-01');
  });
});
