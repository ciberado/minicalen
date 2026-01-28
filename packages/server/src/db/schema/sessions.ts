import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(true),
  name: text('name'),
  state: text('state', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sessionPermissions = sqliteTable('session_permissions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessLevel: text('access_level', { enum: ['viewer', 'editor', 'owner'] }).notNull(),
  grantedAt: integer('granted_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  grantedBy: text('granted_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
