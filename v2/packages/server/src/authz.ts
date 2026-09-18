import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from './db';
import { sessionPermissions, sessions } from './db/schema';

export type AccessLevel = 'viewer' | 'editor' | 'owner';

export interface SessionAccess {
  sessionId: string;
  userId: string | null;
  accessLevel: AccessLevel;
  isOwner: boolean;
}

export async function resolveSessionAccess(
  db: AppDatabase,
  sessionId: string,
  userId: string | null,
): Promise<SessionAccess | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

  if (!session) {
    return null;
  }

  if (userId && session.userId === userId) {
    return { sessionId, userId, accessLevel: 'owner', isOwner: true };
  }

  if (userId) {
    const [permission] = await db
      .select()
      .from(sessionPermissions)
      .where(
        and(
          eq(sessionPermissions.sessionId, sessionId),
          eq(sessionPermissions.userId, userId),
        ),
      );

    if (permission) {
      return {
        sessionId,
        userId,
        accessLevel: permission.accessLevel,
        isOwner: permission.accessLevel === 'owner',
      };
    }
  }

  if (session.visibility === 'public') {
    return { sessionId, userId: userId ?? null, accessLevel: 'viewer', isOwner: false };
  }

  return null;
}

export function canRead(access: SessionAccess | null): boolean {
  return access !== null;
}

export function canEdit(access: SessionAccess | null): boolean {
  return access?.accessLevel === 'editor' || access?.accessLevel === 'owner';
}

export function canShare(access: SessionAccess | null): boolean {
  return access?.accessLevel === 'owner';
}

export function canDelete(access: SessionAccess | null): boolean {
  return access?.accessLevel === 'owner';
}
