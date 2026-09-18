import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { SCHEMA_VERSION } from '@minicalen/shared';
import { APP_VERSION, type AppConfig } from './config';
import type { AppLogger } from './logger';
import type { AppDatabase } from './db';
import type { Auth } from './auth';
import { createAuthMiddleware } from './auth/middleware';
import { createSessionsRouter } from './routes/sessions';

interface AppDeps {
  db: AppDatabase;
  auth: Auth;
  config: AppConfig;
  logger: AppLogger;
}

export function createApp({ db, auth, config, logger }: AppDeps) {
  const app = express();
  const middleware = createAuthMiddleware(auth);

  app.use(
    cors({
      origin: config.trustedOrigins.length > 0 ? config.trustedOrigins : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(cookieParser());
  app.use('/api/auth', toNodeHandler(auth));
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/sessions', createSessionsRouter({ db, auth: middleware, logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: APP_VERSION, schemaVersion: SCHEMA_VERSION });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error }, 'unhandled request error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
