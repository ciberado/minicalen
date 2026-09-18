import { describe, expect, it } from 'vitest';
import { createSessionSchema, sessionSnapshotSchema, shareSessionSchema } from './schema';

describe('createSessionSchema', () => {
  it('accepts an optional name', () => {
    expect(createSessionSchema.parse({})).toEqual({});
    expect(createSessionSchema.parse({ name: 'Holidays' })).toEqual({ name: 'Holidays' });
  });

  it('rejects empty names', () => {
    expect(createSessionSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('shareSessionSchema', () => {
  it('accepts viewer and editor levels', () => {
    expect(shareSessionSchema.parse({ email: 'a@b.com', accessLevel: 'viewer' }).accessLevel).toBe('viewer');
    expect(shareSessionSchema.parse({ email: 'a@b.com', accessLevel: 'editor' }).accessLevel).toBe('editor');
  });

  it('rejects owner level and invalid emails', () => {
    expect(shareSessionSchema.safeParse({ email: 'a@b.com', accessLevel: 'owner' }).success).toBe(false);
    expect(shareSessionSchema.safeParse({ email: 'nope', accessLevel: 'viewer' }).success).toBe(false);
  });
});

describe('sessionSnapshotSchema', () => {
  it('applies default text category ids', () => {
    const parsed = sessionSnapshotSchema.parse({
      schemaVersion: 1,
      categories: [],
      dateMarks: { '2026-01-01': { categoryId: 'c1' } },
    });

    expect(parsed.dateMarks['2026-01-01']).toEqual({ categoryId: 'c1', textCategoryIds: [] });
  });

  it('rejects invalid colors', () => {
    const result = sessionSnapshotSchema.safeParse({
      schemaVersion: 1,
      categories: [
        { id: 'c1', type: 'foreground', label: 'X', color: 'red', order: 0, active: true, visible: true },
      ],
      dateMarks: {},
    });

    expect(result.success).toBe(false);
  });
});
