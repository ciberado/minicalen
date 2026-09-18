import { and, eq, inArray } from 'drizzle-orm';
import { createId, type AccessLevel } from '@minicalen/shared';
import type { AppDatabase } from '../db';
import { sessionPermissions, sessions, users } from '../db/schema';

export type SessionRecord = typeof sessions.$inferSelect;

export interface SessionSummary {
  id: string;
  name: string;
  isAnonymous: boolean;
  visibility: 'private' | 'public';
  accessLevel: AccessLevel;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

export interface CreateSessionInput {
  userId: string | null;
  name?: string;
}

export async function createSession(
  db: AppDatabase,
  input: CreateSessionInput,
): Promise<SessionRecord> {
  const id = createId();

  const [session] = await db
    .insert(sessions)
    .values({
      id,
      userId: input.userId,
      isAnonymous: input.userId === null,
      name: input.name ?? 'Untitled Calendar',
    })
    .returning();

  if (input.userId) {
    await db.insert(sessionPermissions).values({
      id: createId(),
      sessionId: id,
      userId: input.userId,
      accessLevel: 'owner',
      grantedBy: input.userId,
    });
  }

  return session;
}

export async function listSessionsForUser(
  db: AppDatabase,
  userId: string,
): Promise<SessionSummary[]> {
  const owned = await db.select().from(sessions).where(eq(sessions.userId, userId));

  const sharedRows = await db
    .select({ session: sessions, accessLevel: sessionPermissions.accessLevel })
    .from(sessionPermissions)
    .innerJoin(sessions, eq(sessions.id, sessionPermissions.sessionId))
    .where(eq(sessionPermissions.userId, userId));

  const summaries = new Map<string, SessionSummary>();

  for (const session of owned) {
    summaries.set(session.id, toSummary(session, 'owner'));
  }

  for (const row of sharedRows) {
    if (!summaries.has(row.session.id)) {
      summaries.set(row.session.id, toSummary(row.session, row.accessLevel));
    }
  }

  return [...summaries.values()].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

function toSummary(session: SessionRecord, accessLevel: AccessLevel): SessionSummary {
  return {
    id: session.id,
    name: session.name,
    isAnonymous: session.isAnonymous,
    visibility: session.visibility,
    accessLevel,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastAccessedAt: session.lastAccessedAt,
  };
}

export async function getSession(
  db: AppDatabase,
  sessionId: string,
): Promise<SessionRecord | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  return session ?? null;
}

export async function renameSession(
  db: AppDatabase,
  sessionId: string,
  name: string,
): Promise<SessionRecord | null> {
  const [session] = await db
    .update(sessions)
    .set({ name, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return session ?? null;
}

export async function touchSession(db: AppDatabase, sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ lastAccessedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function deleteSession(db: AppDatabase, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function claimSession(
  db: AppDatabase,
  sessionId: string,
  userId: string,
): Promise<SessionRecord | null> {
  const [session] = await db
    .update(sessions)
    .set({ userId, isAnonymous: false, updatedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.isAnonymous, true)))
    .returning();

  if (!session) {
    return null;
  }

  await db
    .insert(sessionPermissions)
    .values({
      id: createId(),
      sessionId,
      userId,
      accessLevel: 'owner',
      grantedBy: userId,
    })
    .onConflictDoNothing();

  return session;
}

export type ShareResult =
  | { ok: true }
  | { ok: false; reason: 'user-not-found' | 'cannot-share-with-owner' };

export async function shareSession(
  db: AppDatabase,
  sessionId: string,
  grantedBy: string,
  email: string,
  accessLevel: Exclude<AccessLevel, 'owner'>,
): Promise<ShareResult> {
  const [target] = await db.select().from(users).where(eq(users.email, email));

  if (!target) {
    return { ok: false, reason: 'user-not-found' };
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (session?.userId === target.id) {
    return { ok: false, reason: 'cannot-share-with-owner' };
  }

  const [existing] = await db
    .select()
    .from(sessionPermissions)
    .where(
      and(
        eq(sessionPermissions.sessionId, sessionId),
        eq(sessionPermissions.userId, target.id),
      ),
    );

  if (existing) {
    await db
      .update(sessionPermissions)
      .set({ accessLevel })
      .where(eq(sessionPermissions.id, existing.id));
  } else {
    await db.insert(sessionPermissions).values({
      id: createId(),
      sessionId,
      userId: target.id,
      accessLevel,
      grantedBy,
    });
  }

  return { ok: true };
}

export async function listPermissions(db: AppDatabase, sessionId: string) {
  return db
    .select({
      userId: sessionPermissions.userId,
      email: users.email,
      name: users.name,
      accessLevel: sessionPermissions.accessLevel,
    })
    .from(sessionPermissions)
    .innerJoin(users, eq(users.id, sessionPermissions.userId))
    .where(eq(sessionPermissions.sessionId, sessionId));
}

export async function deleteSessions(db: AppDatabase, sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) {
    return;
  }

  await db.delete(sessions).where(inArray(sessions.id, sessionIds));
}
