import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { Category } from './domain';
import {
  SCHEMA_VERSION,
  applySnapshot,
  clearDateMark,
  createSessionDocument,
  getCategories,
  getCategory,
  getDateMark,
  getDateMarks,
  getSchemaVersion,
  isEmptySnapshot,
  migrateSessionDocument,
  removeCategory,
  setCategoryOrder,
  setDateCategory,
  snapshotFromDoc,
  toggleDateTextCategory,
  upsertCategory,
} from './ydoc';

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    type: 'foreground',
    label: 'Work',
    color: '#2196F3',
    order: 0,
    active: true,
    visible: true,
    ...overrides,
  };
}

describe('createSessionDocument', () => {
  it('starts empty with the current schema version', () => {
    const session = createSessionDocument();

    expect(session.categories.size).toBe(0);
    expect(session.dateMarks.size).toBe(0);
    expect(getSchemaVersion(session)).toBe(SCHEMA_VERSION);
  });
});

describe('categories', () => {
  it('upserts and reads categories', () => {
    const session = createSessionDocument();

    upsertCategory(session, category());
    upsertCategory(session, category({ label: 'Job' }));

    expect(session.categories.size).toBe(1);
    expect(getCategory(session, 'c1')?.label).toBe('Job');
  });

  it('returns copies so callers cannot mutate the document', () => {
    const session = createSessionDocument();
    upsertCategory(session, category());

    const copy = getCategory(session, 'c1');
    copy!.label = 'Mutated';

    expect(getCategory(session, 'c1')?.label).toBe('Work');
  });

  it('filters by type and sorts by order then label', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'b', label: 'Beta', order: 1 }));
    upsertCategory(session, category({ id: 'a', label: 'Alpha', order: 1 }));
    upsertCategory(session, category({ id: 't', type: 'text', label: 'Holiday', order: 0 }));

    expect(getCategories(session).map((item) => item.id)).toEqual(['t', 'a', 'b']);
    expect(getCategories(session, 'foreground').map((item) => item.id)).toEqual(['a', 'b']);
    expect(getCategories(session, 'text').map((item) => item.id)).toEqual(['t']);
  });

  it('reorders categories by id', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'a', order: 0 }));
    upsertCategory(session, category({ id: 'b', order: 1 }));
    upsertCategory(session, category({ id: 'c', order: 2 }));

    setCategoryOrder(session, ['c', 'a', 'b']);

    expect(getCategories(session).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('removes a category and cascades to date marks', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'fg' }));
    upsertCategory(session, category({ id: 'tx', type: 'text' }));

    setDateCategory(session, '2026-01-01', 'fg');
    toggleDateTextCategory(session, '2026-01-01', 'tx');
    setDateCategory(session, '2026-01-02', 'fg');

    removeCategory(session, 'fg');

    expect(getCategory(session, 'fg')).toBeUndefined();
    expect(getDateMark(session, '2026-01-01')).toEqual({ textCategoryIds: ['tx'] });
    expect(getDateMark(session, '2026-01-02')).toBeUndefined();
  });

  it('removes a text category from date marks', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'tx', type: 'text' }));

    toggleDateTextCategory(session, '2026-01-01', 'tx');
    removeCategory(session, 'tx');

    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
  });
});

describe('date marks', () => {
  it('sets a foreground category and preserves text categories', () => {
    const session = createSessionDocument();

    toggleDateTextCategory(session, '2026-01-01', 'tx');
    setDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryId: 'fg',
      textCategoryIds: ['tx'],
    });
  });

  it('removes the foreground category but keeps text categories', () => {
    const session = createSessionDocument();

    setDateCategory(session, '2026-01-01', 'fg');
    toggleDateTextCategory(session, '2026-01-01', 'tx');
    setDateCategory(session, '2026-01-01', null);

    expect(getDateMark(session, '2026-01-01')).toEqual({ textCategoryIds: ['tx'] });
  });

  it('deletes the mark when nothing remains', () => {
    const session = createSessionDocument();

    setDateCategory(session, '2026-01-01', 'fg');
    setDateCategory(session, '2026-01-01', null);

    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
    expect(session.dateMarks.size).toBe(0);
  });

  it('toggles text categories on and off', () => {
    const session = createSessionDocument();

    toggleDateTextCategory(session, '2026-01-01', 'tx');
    expect(getDateMark(session, '2026-01-01')?.textCategoryIds).toEqual(['tx']);

    toggleDateTextCategory(session, '2026-01-01', 'tx');
    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
  });

  it('clears a mark explicitly', () => {
    const session = createSessionDocument();
    setDateCategory(session, '2026-01-01', 'fg');

    clearDateMark(session, '2026-01-01');

    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
  });

  it('returns a normalized map of marks', () => {
    const session = createSessionDocument();
    setDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMarks(session)).toEqual({
      '2026-01-01': { categoryId: 'fg', textCategoryIds: [] },
    });
  });
});

describe('snapshots', () => {
  it('round-trips a document', () => {
    const session = createSessionDocument();
    upsertCategory(session, category());
    setDateCategory(session, '2026-01-01', 'c1');

    const snapshot = snapshotFromDoc(session);
    const restored = createSessionDocument();
    applySnapshot(restored, snapshot);

    expect(snapshotFromDoc(restored)).toEqual(snapshot);
  });

  it('replaces existing contents', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'old' }));
    setDateCategory(session, '2025-12-31', 'old');

    applySnapshot(session, {
      schemaVersion: SCHEMA_VERSION,
      categories: [category({ id: 'new' })],
      dateMarks: { '2026-02-02': { categoryId: 'new', textCategoryIds: [] } },
    });

    expect(session.categories.size).toBe(1);
    expect(getCategory(session, 'new')).toBeDefined();
    expect(getCategory(session, 'old')).toBeUndefined();
    expect(getDateMark(session, '2025-12-31')).toBeUndefined();
    expect(getDateMark(session, '2026-02-02')?.categoryId).toBe('new');
  });

  it('rejects invalid snapshots', () => {
    const session = createSessionDocument();

    expect(() =>
      applySnapshot(session, {
        schemaVersion: 1,
        categories: [category({ color: 'not-a-color' })],
        dateMarks: {},
      }),
    ).toThrow();
  });

  it('detects empty snapshots', () => {
    expect(isEmptySnapshot({ schemaVersion: 1, categories: [], dateMarks: {} })).toBe(true);
    expect(
      isEmptySnapshot({
        schemaVersion: 1,
        categories: [category()],
        dateMarks: {},
      }),
    ).toBe(false);
  });
});

describe('merging', () => {
  it('merges categories and date marks from two documents', () => {
    const a = createSessionDocument();
    const b = createSessionDocument();

    upsertCategory(a, category({ id: 'a' }));
    upsertCategory(b, category({ id: 'b', label: 'Personal' }));
    setDateCategory(a, '2026-01-01', 'a');
    setDateCategory(b, '2026-01-02', 'b');

    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));

    expect(a.categories.size).toBe(2);
    expect(a.dateMarks.size).toBe(2);
  });
});

describe('migrations', () => {
  it('leaves a current document untouched', () => {
    const session = createSessionDocument();
    migrateSessionDocument(session);

    expect(getSchemaVersion(session)).toBe(SCHEMA_VERSION);
  });
});
