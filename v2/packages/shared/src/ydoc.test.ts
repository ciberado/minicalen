import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { Category, DateMark } from './domain';
import {
  MAX_FOREGROUND_CATEGORIES,
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
  snapshotFromDoc,
  toggleDateCategory,
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

    toggleDateCategory(session, '2026-01-01', 'fg');
    toggleDateTextCategory(session, '2026-01-01', 'tx');
    toggleDateCategory(session, '2026-01-02', 'fg');

    removeCategory(session, 'fg');

    expect(getCategory(session, 'fg')).toBeUndefined();
    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryIds: [],
      textCategoryIds: ['tx'],
    });
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
  it('adds a foreground category and preserves text categories', () => {
    const session = createSessionDocument();

    toggleDateTextCategory(session, '2026-01-01', 'tx');
    toggleDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryIds: ['fg'],
      textCategoryIds: ['tx'],
    });
  });

  it('removes a foreground category but keeps text categories', () => {
    const session = createSessionDocument();

    toggleDateCategory(session, '2026-01-01', 'fg');
    toggleDateTextCategory(session, '2026-01-01', 'tx');
    toggleDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryIds: [],
      textCategoryIds: ['tx'],
    });
  });

  it('deletes the mark when nothing remains', () => {
    const session = createSessionDocument();

    toggleDateCategory(session, '2026-01-01', 'fg');
    toggleDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
    expect(session.dateMarks.size).toBe(0);
  });

  it('allows two foreground categories', () => {
    const session = createSessionDocument();

    toggleDateCategory(session, '2026-01-01', 'a');
    toggleDateCategory(session, '2026-01-01', 'b');

    expect(getDateMark(session, '2026-01-01')?.categoryIds).toEqual(['a', 'b']);
    expect(MAX_FOREGROUND_CATEGORIES).toBe(2);
  });

  it('replaces the oldest category when adding a third', () => {
    const session = createSessionDocument();

    toggleDateCategory(session, '2026-01-01', 'a');
    toggleDateCategory(session, '2026-01-01', 'b');
    toggleDateCategory(session, '2026-01-01', 'c');

    expect(getDateMark(session, '2026-01-01')?.categoryIds).toEqual(['b', 'c']);
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
    toggleDateCategory(session, '2026-01-01', 'fg');

    clearDateMark(session, '2026-01-01');

    expect(getDateMark(session, '2026-01-01')).toBeUndefined();
  });

  it('returns a normalized map of marks', () => {
    const session = createSessionDocument();
    toggleDateCategory(session, '2026-01-01', 'fg');

    expect(getDateMarks(session)).toEqual({
      '2026-01-01': { categoryIds: ['fg'], textCategoryIds: [] },
    });
  });
});

describe('snapshots', () => {
  it('round-trips a document', () => {
    const session = createSessionDocument();
    upsertCategory(session, category());
    toggleDateCategory(session, '2026-01-01', 'c1');

    const snapshot = snapshotFromDoc(session);
    const restored = createSessionDocument();
    applySnapshot(restored, snapshot);

    expect(snapshotFromDoc(restored)).toEqual(snapshot);
  });

  it('replaces existing contents', () => {
    const session = createSessionDocument();
    upsertCategory(session, category({ id: 'old' }));
    toggleDateCategory(session, '2025-12-31', 'old');

    applySnapshot(session, {
      schemaVersion: SCHEMA_VERSION,
      categories: [category({ id: 'new' })],
      dateMarks: { '2026-02-02': { categoryIds: ['new'], textCategoryIds: [] } },
    });

    expect(session.categories.size).toBe(1);
    expect(getCategory(session, 'new')).toBeDefined();
    expect(getCategory(session, 'old')).toBeUndefined();
    expect(getDateMark(session, '2025-12-31')).toBeUndefined();
    expect(getDateMark(session, '2026-02-02')?.categoryIds).toEqual(['new']);
  });

  it('rejects invalid snapshots', () => {
    const session = createSessionDocument();

    expect(() =>
      applySnapshot(session, {
        schemaVersion: SCHEMA_VERSION,
        categories: [category({ color: 'not-a-color' })],
        dateMarks: {},
      }),
    ).toThrow();
  });

  it('detects empty snapshots', () => {
    expect(isEmptySnapshot({ schemaVersion: SCHEMA_VERSION, categories: [], dateMarks: {} })).toBe(true);
    expect(
      isEmptySnapshot({
        schemaVersion: SCHEMA_VERSION,
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
    toggleDateCategory(a, '2026-01-01', 'a');
    toggleDateCategory(b, '2026-01-02', 'b');

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

  it('migrates a v1 document with a single categoryId', () => {
    const session = createSessionDocument();
    session.meta.set('schemaVersion', 1);
    session.dateMarks.set('2026-01-01', {
      categoryId: 'fg',
      textCategoryIds: ['tx'],
    } as unknown as DateMark);

    migrateSessionDocument(session);

    expect(getSchemaVersion(session)).toBe(SCHEMA_VERSION);
    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryIds: ['fg'],
      textCategoryIds: ['tx'],
    });
  });

  it('migrates legacy marks without a category', () => {
    const session = createSessionDocument();
    session.meta.set('schemaVersion', 1);
    session.dateMarks.set('2026-01-01', {
      textCategoryIds: ['tx'],
    } as unknown as DateMark);

    migrateSessionDocument(session);

    expect(getDateMark(session, '2026-01-01')).toEqual({
      categoryIds: [],
      textCategoryIds: ['tx'],
    });
  });
});
