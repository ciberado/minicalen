import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { createSessionDocument, toggleDateCategory } from '@minicalen/shared';
import { createApp } from '../app';
import { createTestContext, type TestContext } from '../test/helpers';
import { createCollaborationServer } from './server';
import { createSession, shareSession } from '../sessions/service';
import { loadSnapshot } from './persistence';

const PORT = 23000 + Math.floor(Math.random() * 5000);
const URL = `ws://127.0.0.1:${PORT}`;

function connect(name: string, token: string) {
  const doc = new Y.Doc();
  let resolveScope: (scope: string) => void = () => {};
  let rejectScope: (error: Error) => void = () => {};
  const scope = new Promise<string>((resolve, reject) => {
    resolveScope = resolve;
    rejectScope = reject;
  });

  const provider = new HocuspocusProvider({
    url: URL,
    name,
    document: doc,
    token,
    onAuthenticated: ({ scope: authorizedScope }) => resolveScope(authorizedScope),
    onAuthenticationFailed: ({ reason }) => rejectScope(new Error(reason)),
  });

  return { doc, provider, scope };
}

async function signUp(app: Express, email: string) {
  const response = await request(app)
    .post('/api/auth/sign-up/email')
    .send({ email, password: 'password-1234', name: email });
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const sessionCookie = cookies.find((cookie) => cookie.startsWith('minicalen.session_token='));
  const token = sessionCookie?.split(';')[0].split('=').slice(1).join('=') ?? '';

  return { token, userId: response.body.user.id as string };
}

describe('collaboration server', () => {
  let ctx: TestContext;
  let app: Express;
  let collaboration: ReturnType<typeof createCollaborationServer>;

  beforeAll(async () => {
    ctx = createTestContext();
    app = createApp(ctx);
    collaboration = createCollaborationServer({
      db: ctx.db,
      auth: ctx.auth,
      config: { ...ctx.config, collabPort: PORT },
      logger: ctx.logger,
    });
    await collaboration.listen();
  });

  afterAll(async () => {
    await collaboration.destroy();
  });

  it('authenticates the owner and persists edits', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const { session } = await createSession(ctx.db, { userId: owner.userId, name: 'Owner' });
    const { doc, provider, scope } = connect(session.id, owner.token);

    expect(await scope).toBe('read-write');

    const sessionDoc = createSessionDocument(doc);
    toggleDateCategory(sessionDoc, '2026-01-01', 'fg');

    await new Promise((resolve) => setTimeout(resolve, 400));
    collaboration.hocuspocus.flushPendingStores();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = await loadSnapshot(ctx.db, session.id);
    expect(snapshot?.dateMarks['2026-01-01']?.categoryIds).toEqual(['fg']);

    provider.destroy();
  });

  it('marks viewers as read-only', async () => {
    const owner = await signUp(app, 'owner2@example.com');
    const viewer = await signUp(app, 'viewer@example.com');
    const { session } = await createSession(ctx.db, { userId: owner.userId, name: 'Shared' });

    await shareSession(ctx.db, session.id, owner.userId, 'viewer@example.com', 'viewer');

    const { provider, scope } = connect(session.id, viewer.token);
    expect(await scope).toBe('readonly');

    provider.destroy();
  });

  it('rejects anonymous access to private sessions', async () => {
    const owner = await signUp(app, 'owner3@example.com');
    const { session } = await createSession(ctx.db, { userId: owner.userId, name: 'Private' });
    const { provider, scope } = connect(session.id, '');

    await expect(scope).rejects.toThrow();

    provider.destroy();
  });
});
