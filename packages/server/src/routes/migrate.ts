import { Router } from 'express';
import { db } from '../db';
import { sessions, categories, dateInfo } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import logger from '../logger';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

interface LegacySession {
  foregroundCategories?: Array<{
    id: string;
    name: string;
    color?: string;
    backgroundColor?: string;
  }>;
  backgroundCategories?: Array<{
    id: string;
    name: string;
    color?: string;
    backgroundColor?: string;
  }>;
  tagCategories?: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  dateInfoMap?: Array<[string, { color: string; categoryId: string }]>;
  timestamp?: string;
}

// POST /api/migrate/legacy-sessions - Migrate all legacy JSON sessions to database
router.post('/legacy-sessions', async (_req, res) => {
  try {
    const sessionsDir = path.join(__dirname, '../../data/sessions');
    const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const sessionId = file.replace('.json', '');

        // Check if already migrated
        const existing = await db.query.sessions.findFirst({
          where: (sessions, { eq }) => eq(sessions.id, sessionId),
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Read legacy session file
        const filePath = path.join(sessionsDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const legacySession: LegacySession = JSON.parse(content);

        // Create session in database
        await db.insert(sessions).values({
          id: sessionId,
          userId: null,
          isAnonymous: true,
          name: 'Migrated Calendar',
          state: content,
          createdAt: new Date(legacySession.timestamp || Date.now()),
          updatedAt: new Date(legacySession.timestamp || Date.now()),
          lastAccessedAt: new Date(),
        });

        // Migrate categories
        const categoryMap: { [oldId: string]: string } = {};

        if (legacySession.foregroundCategories) {
          for (const [index, cat] of legacySession.foregroundCategories.entries()) {
            const newId = uuidv4();
            categoryMap[cat.id] = newId;

            await db.insert(categories).values({
              id: newId,
              sessionId,
              name: cat.name,
              type: 'foreground',
              color: cat.color,
              backgroundColor: cat.backgroundColor,
              order: index,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (legacySession.backgroundCategories) {
          for (const [index, cat] of legacySession.backgroundCategories.entries()) {
            const newId = uuidv4();
            categoryMap[cat.id] = newId;

            await db.insert(categories).values({
              id: newId,
              sessionId,
              name: cat.name,
              type: 'background',
              color: cat.color,
              backgroundColor: cat.backgroundColor,
              order: index + (legacySession.foregroundCategories?.length || 0),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (legacySession.tagCategories) {
          for (const [index, cat] of legacySession.tagCategories.entries()) {
            const newId = uuidv4();
            categoryMap[cat.id] = newId;

            await db.insert(categories).values({
              id: newId,
              sessionId,
              name: cat.name,
              type: 'tag',
              color: cat.color,
              backgroundColor: null,
              order:
                index +
                (legacySession.foregroundCategories?.length || 0) +
                (legacySession.backgroundCategories?.length || 0),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // Migrate date info
        if (legacySession.dateInfoMap) {
          for (const [dateStr, info] of legacySession.dateInfoMap) {
            const newCategoryId = categoryMap[info.categoryId];
            if (newCategoryId) {
              await db.insert(dateInfo).values({
                id: uuidv4(),
                sessionId,
                date: dateStr,
                categoryId: newCategoryId,
                color: info.color,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }
        }

        migrated++;
        logger.info(`Migrated session ${sessionId}`);
      } catch (error) {
        const errorMsg = `Failed to migrate ${file}: ${error}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    res.json({
      success: true,
      migrated,
      skipped,
      total: files.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Error migrating sessions:', error);
    res.status(500).json({ error: 'Failed to migrate sessions' });
  }
});

// POST /api/migrate/session/:id - Migrate specific legacy session
router.post('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if already migrated
    const existing = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, id),
    });

    if (existing) {
      res.status(400).json({ error: 'Session already migrated' });
      return;
    }

    // Read legacy session file
    const filePath = path.join(__dirname, '../../data/sessions', `${id}.json`);
    const content = readFileSync(filePath, 'utf-8');
    const legacySession: LegacySession = JSON.parse(content);

    // Create session in database
    await db.insert(sessions).values({
      id,
      userId: null,
      isAnonymous: true,
      name: 'Migrated Calendar',
      state: content,
      createdAt: new Date(legacySession.timestamp || Date.now()),
      updatedAt: new Date(legacySession.timestamp || Date.now()),
      lastAccessedAt: new Date(),
    });

    // Migrate categories
    const categoryMap: { [oldId: string]: string } = {};

    if (legacySession.foregroundCategories) {
      for (const [index, cat] of legacySession.foregroundCategories.entries()) {
        const newId = uuidv4();
        categoryMap[cat.id] = newId;

        await db.insert(categories).values({
          id: newId,
          sessionId: id,
          name: cat.name,
          type: 'foreground',
          color: cat.color,
          backgroundColor: cat.backgroundColor,
          order: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (legacySession.backgroundCategories) {
      for (const [index, cat] of legacySession.backgroundCategories.entries()) {
        const newId = uuidv4();
        categoryMap[cat.id] = newId;

        await db.insert(categories).values({
          id: newId,
          sessionId: id,
          name: cat.name,
          type: 'background',
          color: cat.color,
          backgroundColor: cat.backgroundColor,
          order: index + (legacySession.foregroundCategories?.length || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (legacySession.tagCategories) {
      for (const [index, cat] of legacySession.tagCategories.entries()) {
        const newId = uuidv4();
        categoryMap[cat.id] = newId;

        await db.insert(categories).values({
          id: newId,
          sessionId: id,
          name: cat.name,
          type: 'tag',
          color: cat.color,
          backgroundColor: null,
          order:
            index +
            (legacySession.foregroundCategories?.length || 0) +
            (legacySession.backgroundCategories?.length || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Migrate date info
    if (legacySession.dateInfoMap) {
      for (const [dateStr, info] of legacySession.dateInfoMap) {
        const newCategoryId = categoryMap[info.categoryId];
        if (newCategoryId) {
          await db.insert(dateInfo).values({
            id: uuidv4(),
            sessionId: id,
            date: dateStr,
            categoryId: newCategoryId,
            color: info.color,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error migrating session:', error);
    res.status(500).json({ error: 'Failed to migrate session' });
  }
});

export default router;
