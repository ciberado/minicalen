import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { SCHEMA_VERSION, createSessionDocument, migrateSessionDocument } from '@minicalen/shared';
import type { AppConfig } from '../config';
import type { AppLogger } from '../logger';
import type { AppDatabase } from '../db';
import type { Auth } from '../auth';
import { canEdit, resolveSessionAccess, type AccessLevel } from '../authz';
import { loadDocumentUpdate, storeDocumentUpdate } from './persistence';

export interface CollaborationContext {
  userId: string | null;
  accessLevel: AccessLevel;
}

interface CollaborationDeps {
  db: AppDatabase;
  auth: Auth;
  config: AppConfig;
  logger: AppLogger;
}

export function createCollaborationServer({ db, auth, config, logger }: CollaborationDeps) {
  return new Server<CollaborationContext>({
    port: config.collabPort,
    address: '0.0.0.0',
    quiet: true,
    debounce: 2000,
    maxDebounce: 10000,
    async onAuthenticate({ documentName, token, requestHeaders, connectionConfig }) {
      const headers = new Headers(requestHeaders);

      if (token && !headers.get('cookie')) {
        headers.set('cookie', `minicalen.session_token=${token}`);
      }

      const session = await auth.api.getSession({ headers });
      const userId = session?.user?.id ?? null;
      const access = await resolveSessionAccess(db, documentName, userId, token || null);

      if (!access) {
        throw new Error('Access denied');
      }

      connectionConfig.readOnly = !canEdit(access);

      return { userId, accessLevel: access.accessLevel };
    },
    async onLoadDocument({ documentName }) {
      const document = new Y.Doc();
      const update = await loadDocumentUpdate(db, documentName);

      if (update) {
        Y.applyUpdate(document, update);
      }

      migrateSessionDocument(createSessionDocument(document));

      return document;
    },
    async onStoreDocument({ documentName, document }) {
      const update = Y.encodeStateAsUpdate(document);
      await storeDocumentUpdate(db, documentName, update, SCHEMA_VERSION);
      logger.debug({ documentName, bytes: update.byteLength }, 'stored collaboration document');
    },
  });
}

export type CollaborationServer = ReturnType<typeof createCollaborationServer>;
