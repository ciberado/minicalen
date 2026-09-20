import { Router, type NextFunction, type Request, type Response } from 'express';
import type { AppLogger } from '../logger';
import {
  createSessionSchema,
  sessionSnapshotSchema,
  shareSessionSchema,
  updateSessionSchema,
} from '@minicalen/shared';
import type { AppDatabase } from '../db';
import type { AuthMiddleware, AuthRequest } from '../auth/middleware';
import {
  canDelete,
  canEdit,
  canRead,
  canShare,
  resolveSessionAccess,
} from '../authz';
import {
  claimSession,
  createSession,
  deleteSession,
  getSession,
  listPermissions,
  listSessionsForUser,
  renameSession,
  shareSession,
  touchSession,
} from '../sessions/service';
import { loadSnapshot, storeSnapshot } from '../realtime/persistence';

interface SessionsRouterDeps {
  db: AppDatabase;
  auth: AuthMiddleware;
  logger: AppLogger;
}

function asyncHandler(
  handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as AuthRequest, res, next).catch(next);
  };
}

export function createSessionsRouter({ db, auth, logger }: SessionsRouterDeps): Router {
  const router = Router();

  router.get(
    '/',
    auth.requireAuth,
    asyncHandler(async (req, res) => {
      const sessions = await listSessionsForUser(db, req.user!.id);
      res.json({ sessions });
    }),
  );

  router.post(
    '/',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const parsed = createSessionSchema.safeParse(req.body ?? {});

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      const created = await createSession(db, {
        userId: req.user?.id ?? null,
        name: parsed.data.name,
      });

      res.status(201).json({
        session: serializeSession(created.session),
        token: created.token,
      });
    }),
  );

  router.get(
    '/:id',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const id = String(String(req.params.id));
      const access = await resolveSessionAccess(db, id, req.user?.id ?? null, req.sessionToken);

      if (!access) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const session = await getSession(db, id);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await touchSession(db, session.id);

      res.json({ session: serializeSession(session), accessLevel: access.accessLevel });
    }),
  );

  router.patch(
    '/:id',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(db, String(req.params.id), req.user?.id ?? null, req.sessionToken);

      if (!canEdit(access)) {
        res.status(access ? 403 : 404).json({ error: access ? 'Access denied' : 'Session not found' });
        return;
      }

      const parsed = updateSessionSchema.safeParse(req.body ?? {});

      if (!parsed.success || !parsed.data.name) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      const session = await renameSession(db, String(req.params.id), parsed.data.name);
      res.json({ session: session ? serializeSession(session) : null });
    }),
  );

  router.delete(
    '/:id',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(
        db,
        String(req.params.id),
        req.user?.id ?? null,
        req.sessionToken,
      );

      if (!canDelete(access)) {
        res.status(access ? 403 : 404).json({ error: access ? 'Access denied' : 'Session not found' });
        return;
      }

      await deleteSession(db, String(req.params.id));
      res.json({ success: true });
    }),
  );

  router.post(
    '/:id/claim',
    auth.requireAuth,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      const existing = await getSession(db, String(req.params.id));

      if (!existing) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (!existing.isAnonymous) {
        res.status(409).json({ error: 'Session is already owned' });
        return;
      }

      const session = await claimSession(db, String(req.params.id), userId);
      res.json({ session: session ? serializeSession(session) : null });
    }),
  );

  router.post(
    '/:id/share',
    auth.requireAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(
        db,
        String(req.params.id),
        req.user!.id,
        req.sessionToken,
      );

      if (!canShare(access)) {
        res.status(access ? 403 : 404).json({ error: access ? 'Access denied' : 'Session not found' });
        return;
      }

      const parsed = shareSessionSchema.safeParse(req.body ?? {});

      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      const result = await shareSession(
        db,
        String(req.params.id),
        req.user!.id,
        parsed.data.email,
        parsed.data.accessLevel,
      );

      if (!result.ok) {
        const status = result.reason === 'user-not-found' ? 404 : 400;
        res.status(status).json({ error: result.reason });
        return;
      }

      res.json({ success: true });
    }),
  );

  router.get(
    '/:id/permissions',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(
        db,
        String(req.params.id),
        req.user?.id ?? null,
        req.sessionToken,
      );

      if (!canRead(access)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json({ permissions: await listPermissions(db, String(req.params.id)) });
    }),
  );

  router.get(
    '/:id/state',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(db, String(req.params.id), req.user?.id ?? null, req.sessionToken);

      if (!canRead(access)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const snapshot = await loadSnapshot(db, String(req.params.id));
      res.json({ snapshot });
    }),
  );

  router.put(
    '/:id/state',
    auth.optionalAuth,
    asyncHandler(async (req, res) => {
      const access = await resolveSessionAccess(db, String(req.params.id), req.user?.id ?? null, req.sessionToken);

      if (!canEdit(access)) {
        res.status(access ? 403 : 404).json({ error: access ? 'Access denied' : 'Session not found' });
        return;
      }

      const parsed = sessionSnapshotSchema.safeParse(req.body);

      if (!parsed.success) {
        logger.debug({ issues: parsed.error.issues }, 'Invalid snapshot payload');
        res.status(400).json({ error: 'Invalid snapshot' });
        return;
      }

      await storeSnapshot(db, String(req.params.id), parsed.data);
      res.json({ success: true });
    }),
  );

  return router;
}

function serializeSession(session: {
  id: string;
  userId: string | null;
  isAnonymous: boolean;
  name: string;
  visibility: 'private' | 'public';
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}) {
  return {
    id: session.id,
    userId: session.userId,
    isAnonymous: session.isAnonymous,
    name: session.name,
    visibility: session.visibility,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastAccessedAt: session.lastAccessedAt,
  };
}
