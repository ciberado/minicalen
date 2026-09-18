import pino from 'pino';
import { loadConfig, type AppConfig } from '../config';
import { createAuth, type Auth } from '../auth';
import { createDatabase, runMigrations, type AppDatabase } from '../db';
import type { AppLogger } from '../logger';

export interface TestContext {
  config: AppConfig;
  db: AppDatabase;
  sqlite: ReturnType<typeof createDatabase>['sqlite'];
  auth: Auth;
  logger: AppLogger;
}

export function createTestContext(env: NodeJS.ProcessEnv = {}): TestContext {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: ':memory:',
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    ...env,
  });
  const { db, sqlite } = createDatabase(':memory:');
  runMigrations(db);
  const auth = createAuth(db, config);
  const logger = pino({ level: 'silent' }) as AppLogger;

  return { config, db, sqlite, auth, logger };
}
