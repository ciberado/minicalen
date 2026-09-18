import { Router } from 'express';
import { db } from '../db';
import { sessions, sessionPermissions } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuth, requireAuth, AuthRequest } from '../auth/middleware';
import logger from '../logger';

const router = Router();

// GET /api/sessions - List user's sessions (authenticated users only)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get sessions where user is owner or has permissions
    const userSessions = await db
      .select({
        id: sessions.id,
        name: sessions.name,
        isAnonymous: sessions.isAnonymous,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        lastAccessedAt: sessions.lastAccessedAt,
        accessLevel: sessionPermissions.accessLevel,
      })
      .from(sessions)
      .leftJoin(
        sessionPermissions,
        eq(sessionPermissions.sessionId, sessions.id)
      )
      .where(
        or(
          eq(sessions.userId, userId),
          eq(sessionPermissions.userId, userId)
        )
      );

    res.json({ sessions: userSessions });
  } catch (error) {
    logger.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// POST /api/sessions - Create or update session (upsert)
router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id, name, state } = req.body;
    
    // Use provided ID or generate new one
    const sessionId = id || uuidv4();
    
    // Use provided state or create empty state
    const sessionState = state || {
      foregroundCategories: [],
      dateInfoMap: [],
      timestamp: new Date().toISOString(),
    };

    // Check if session already exists
    const [existingSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    let resultSession;

    if (existingSession) {
      // Update existing session
      logger.info(`Updating existing session: ${sessionId}`);
      const [updatedSession] = await db
        .update(sessions)
        .set({
          state: JSON.stringify(sessionState),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          ...(name && { name }),
        })
        .where(eq(sessions.id, sessionId))
        .returning();
      resultSession = updatedSession;
    } else {
      // Create new session
      logger.info(`Creating new session: ${sessionId}`);
      const [newSession] = await db
        .insert(sessions)
        .values({
          id: sessionId,
          userId: userId || null,
          isAnonymous: !userId,
          name: name || 'Untitled Calendar',
          state: JSON.stringify(sessionState),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
        })
        .returning();
      resultSession = newSession;

      // If user is authenticated, create owner permission for new sessions
      if (userId) {
        await db.insert(sessionPermissions).values({
          id: uuidv4(),
          sessionId,
          userId,
          accessLevel: 'owner',
          grantedAt: new Date(),
          grantedBy: userId,
        });
      }
    }

    res.json({ session: resultSession });
  } catch (error) {
    logger.error('Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// GET /api/sessions/:id - Get session state
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user has access (if authenticated)
    if (userId && session.userId && session.userId !== userId) {
      const [permission] = await db
        .select()
        .from(sessionPermissions)
        .where(
          and(
            eq(sessionPermissions.sessionId, id),
            eq(sessionPermissions.userId, userId)
          )
        );

      if (!permission) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Update last accessed timestamp
    await db
      .update(sessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(sessions.id, id));

    res.json({
      session: {
        id: session.id,
        name: session.name,
        isAnonymous: session.isAnonymous,
        state: session.state,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// PUT /api/sessions/:id - Update session state
router.put('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { state, name } = req.body;

    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user has edit access
    if (userId && session.userId && session.userId !== userId) {
      const [permission] = await db
        .select()
        .from(sessionPermissions)
        .where(
          and(
            eq(sessionPermissions.sessionId, id),
            eq(sessionPermissions.userId, userId)
          )
        );

      if (!permission || permission.accessLevel === 'viewer') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    // Update session
    const updates: {
      updatedAt: Date;
      state?: string;
      name?: string;
    } = {
      updatedAt: new Date(),
    };

    if (state !== undefined) {
      updates.state = JSON.stringify(state);
    }

    if (name !== undefined) {
      updates.name = name;
    }

    const [updatedSession] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();

    res.json({ session: updatedSession });
  } catch (error) {
    logger.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user has owner access
    if (session.userId) {
      if (!userId || session.userId !== userId) {
        const [permission] = await db
          .select()
          .from(sessionPermissions)
          .where(
            and(
              eq(sessionPermissions.sessionId, id),
              eq(sessionPermissions.userId, userId!)
            )
          );

        if (!permission || permission.accessLevel !== 'owner') {
          res.status(403).json({ error: 'Only owner can delete session' });
          return;
        }
      }
    }

    // Delete session (cascade will delete related records)
    await db.delete(sessions).where(eq(sessions.id, id));

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/sessions/:id/claim - Claim anonymous session
router.post('/:id/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (!session.isAnonymous) {
      res.status(400).json({ error: 'Session is not anonymous' });
      return;
    }

    // Claim session
    const [updatedSession] = await db
      .update(sessions)
      .set({
        userId,
        isAnonymous: false,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();

    // Create owner permission
    await db.insert(sessionPermissions).values({
      id: uuidv4(),
      sessionId: id,
      userId,
      accessLevel: 'owner',
      grantedAt: new Date(),
      grantedBy: userId,
    });

    res.json({ session: updatedSession });
  } catch (error) {
    logger.error('Error claiming session:', error);
    res.status(500).json({ error: 'Failed to claim session' });
  }
});

// POST /api/sessions/:id/share - Share session with user
router.post('/:id/share', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { email, accessLevel } = req.body;

    if (!email || !accessLevel) {
      res.status(400).json({ error: 'Email and accessLevel required' });
      return;
    }

    if (!['viewer', 'editor'].includes(accessLevel)) {
      res.status(400).json({ error: 'Invalid access level' });
      return;
    }

    // Get session
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check if user is owner
    if (session.userId !== userId) {
      const [permission] = await db
        .select()
        .from(sessionPermissions)
        .where(
          and(
            eq(sessionPermissions.sessionId, id),
            eq(sessionPermissions.userId, userId)
          )
        );

      if (!permission || permission.accessLevel !== 'owner') {
        res.status(403).json({ error: 'Only owner can share session' });
        return;
      }
    }

    // Find user by email
    const targetUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if permission already exists
    const [existingPermission] = await db
      .select()
      .from(sessionPermissions)
      .where(
        and(
          eq(sessionPermissions.sessionId, id),
          eq(sessionPermissions.userId, targetUser.id)
        )
      );

    if (existingPermission) {
      // Update existing permission
      await db
        .update(sessionPermissions)
        .set({ accessLevel: accessLevel as 'viewer' | 'editor' })
        .where(eq(sessionPermissions.id, existingPermission.id));
    } else {
      // Create new permission
      await db.insert(sessionPermissions).values({
        id: uuidv4(),
        sessionId: id,
        userId: targetUser.id,
        accessLevel: accessLevel as 'viewer' | 'editor',
        grantedAt: new Date(),
        grantedBy: userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error sharing session:', error);
    res.status(500).json({ error: 'Failed to share session' });
  }
});

export default router;
