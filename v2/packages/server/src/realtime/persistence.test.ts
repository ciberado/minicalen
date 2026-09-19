import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/helpers';
import { SCHEMA_VERSION } from '@minicalen/shared';
import {
  loadDocumentUpdate,
  loadSnapshot,
  storeDocumentUpdate,
  storeSnapshot,
} from './persistence';
import { sessions } from '../db/schema';

async function seedSession(db: ReturnType<typeof createTestContext>['db'], id: string) {
  await db.insert(sessions).values({ id, name: 'Test', userId: null, isAnonymous: true });
}

describe('collaboration persistence', () => {
  it('returns null when no document is stored', async () => {
    const { db } = createTestContext();
    await seedSession(db, 's1');

    expect(await loadDocumentUpdate(db, 's1')).toBeNull();
    expect(await loadSnapshot(db, 's1')).toBeNull();
  });

  it('stores and loads raw Yjs updates', async () => {
    const { db } = createTestContext();
    await seedSession(db, 's1');

    const update = new Uint8Array([1, 2, 3]);
    await storeDocumentUpdate(db, 's1', update, SCHEMA_VERSION);

    expect(await loadDocumentUpdate(db, 's1')).toEqual(update);
  });

  it('round-trips snapshots', async () => {
    const { db } = createTestContext();
    await seedSession(db, 's1');

    const snapshot = {
      schemaVersion: SCHEMA_VERSION,
      categories: [
        {
          id: 'c1',
          type: 'foreground' as const,
          label: 'Work',
          color: '#2196F3',
          order: 0,
          active: true,
          visible: true,
        },
      ],
      dateMarks: { '2026-01-01': { categoryIds: ['c1'], textCategoryIds: [] } },
    };

    await storeSnapshot(db, 's1', snapshot);

    expect(await loadSnapshot(db, 's1')).toEqual(snapshot);
  });

  it('overwrites an existing snapshot', async () => {
    const { db } = createTestContext();
    await seedSession(db, 's1');

    await storeSnapshot(db, 's1', {
      schemaVersion: SCHEMA_VERSION,
      categories: [],
      dateMarks: { '2026-01-01': { categoryIds: [], textCategoryIds: ['t1'] } },
    });
    await storeSnapshot(db, 's1', {
      schemaVersion: SCHEMA_VERSION,
      categories: [],
      dateMarks: {},
    });

    expect(await loadSnapshot(db, 's1')).toEqual({
      schemaVersion: SCHEMA_VERSION,
      categories: [],
      dateMarks: {},
    });
  });
});
