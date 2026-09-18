import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type AppDatabase = ReturnType<typeof createDatabase>['db'];

export function createDatabase(filename: string) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export const defaultMigrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

export function runMigrations(
  db: AppDatabase,
  migrationsFolder: string = defaultMigrationsFolder,
): void {
  migrate(db, { migrationsFolder });
}
