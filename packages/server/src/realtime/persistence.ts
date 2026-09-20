import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import {
  SCHEMA_VERSION,
  applySnapshot,
  createSessionDocument,
  snapshotFromDoc,
  type SessionSnapshot,
} from '@minicalen/shared';
import type { AppDatabase } from '../db';
import { sessionDocuments } from '../db/schema';

export async function loadDocumentUpdate(
  db: AppDatabase,
  sessionId: string,
): Promise<Uint8Array | null> {
  const [row] = await db
    .select()
    .from(sessionDocuments)
    .where(eq(sessionDocuments.sessionId, sessionId));

  return row ? new Uint8Array(row.snapshot) : null;
}

export async function storeDocumentUpdate(
  db: AppDatabase,
  sessionId: string,
  update: Uint8Array,
  schemaVersion: number = SCHEMA_VERSION,
): Promise<void> {
  const snapshot = Buffer.from(update);
  const updatedAt = new Date();

  await db
    .insert(sessionDocuments)
    .values({ sessionId, snapshot, schemaVersion, updatedAt })
    .onConflictDoUpdate({
      target: sessionDocuments.sessionId,
      set: { snapshot, schemaVersion, updatedAt },
    });
}

export async function loadSnapshot(
  db: AppDatabase,
  sessionId: string,
): Promise<SessionSnapshot | null> {
  const update = await loadDocumentUpdate(db, sessionId);

  if (!update) {
    return null;
  }

  const document = new Y.Doc();
  Y.applyUpdate(document, update);
  return snapshotFromDoc(createSessionDocument(document));
}

export async function storeSnapshot(
  db: AppDatabase,
  sessionId: string,
  snapshot: SessionSnapshot,
): Promise<void> {
  const session = createSessionDocument();
  applySnapshot(session, snapshot);
  const update = Y.encodeStateAsUpdate(session.doc);
  await storeDocumentUpdate(db, sessionId, update, snapshot.schemaVersion);
}
