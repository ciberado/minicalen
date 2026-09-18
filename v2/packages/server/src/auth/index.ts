import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { AppConfig } from '../config';
import type { AppDatabase } from '../db';
import * as schema from '../db/schema';

export function createAuth(db: AppDatabase, config: AppConfig) {
  return betterAuth({
    secret: config.authSecret,
    baseURL: config.authBaseUrl,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.betterAuthSessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: config.trustedOrigins,
    advanced: {
      cookiePrefix: 'minicalen',
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Awaited<ReturnType<Auth['api']['getSession']>>;
