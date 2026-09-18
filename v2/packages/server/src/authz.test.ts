import { describe, expect, it } from 'vitest';
import {
  canDelete,
  canEdit,
  canRead,
  canShare,
  resolveSessionAccess,
} from './authz';
import { createTestContext } from './test/helpers';
import { sessionPermissions, sessions, users } from './db/schema';

async function seedUser(db: ReturnType<typeof createTestContext>['db'], id: string, email: string) {
  await db.insert(users).values({ id, email, name: id });
}

async function seedSession(
  db: ReturnType<typeof createTestContext>['db'],
  overrides: Partial<typeof sessions.$inferInsert> & { id: string },
) {
  await db.insert(sessions).values({
    name: 'Test',
    userId: null,
    isAnonymous: true,
    visibility: 'private',
    ...overrides,
  });
}

describe('resolveSessionAccess', () => {
  it('returns null for a missing session', async () => {
    const { db } = createTestContext();
    expect(await resolveSessionAccess(db, 'missing', null)).toBeNull();
  });

  it('grants owner access to the session owner', async () => {
    const { db } = createTestContext();
    await seedUser(db, 'u1', 'u1@example.com');
    await seedSession(db, { id: 's1', userId: 'u1', isAnonymous: false });

    const access = await resolveSessionAccess(db, 's1', 'u1');

    expect(access).toMatchObject({ accessLevel: 'owner', isOwner: true });
    expect(canEdit(access)).toBe(true);
    expect(canShare(access)).toBe(true);
    expect(canDelete(access)).toBe(true);
  });

  it('denies access to unrelated authenticated users on private sessions', async () => {
    const { db } = createTestContext();
    await seedUser(db, 'u1', 'u1@example.com');
    await seedUser(db, 'u2', 'u2@example.com');
    await seedSession(db, { id: 's1', userId: 'u1', isAnonymous: false });

    expect(await resolveSessionAccess(db, 's1', 'u2')).toBeNull();
  });

  it('denies anonymous access to private sessions', async () => {
    const { db } = createTestContext();
    await seedSession(db, { id: 's1', userId: null, isAnonymous: true });

    expect(await resolveSessionAccess(db, 's1', null)).toBeNull();
  });

  it('allows anonymous read-only access to public sessions', async () => {
    const { db } = createTestContext();
    await seedSession(db, { id: 's1', visibility: 'public' });

    const access = await resolveSessionAccess(db, 's1', null);

    expect(access).toMatchObject({ accessLevel: 'viewer', isOwner: false });
    expect(canRead(access)).toBe(true);
    expect(canEdit(access)).toBe(false);
  });

  it('resolves explicit viewer and editor permissions', async () => {
    const { db } = createTestContext();
    await seedUser(db, 'owner', 'owner@example.com');
    await seedUser(db, 'viewer', 'viewer@example.com');
    await seedUser(db, 'editor', 'editor@example.com');
    await seedSession(db, { id: 's1', userId: 'owner', isAnonymous: false });

    await db.insert(sessionPermissions).values([
      { id: 'p1', sessionId: 's1', userId: 'viewer', accessLevel: 'viewer', grantedBy: 'owner' },
      { id: 'p2', sessionId: 's1', userId: 'editor', accessLevel: 'editor', grantedBy: 'owner' },
    ]);

    const viewer = await resolveSessionAccess(db, 's1', 'viewer');
    const editor = await resolveSessionAccess(db, 's1', 'editor');

    expect(viewer?.accessLevel).toBe('viewer');
    expect(canEdit(viewer)).toBe(false);
    expect(editor?.accessLevel).toBe('editor');
    expect(canEdit(editor)).toBe(true);
    expect(canShare(editor)).toBe(false);
  });
});
