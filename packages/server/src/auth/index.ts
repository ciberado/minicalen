import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
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
    requireEmailVerification: false, // Start with false for development
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
  user: {
    additionalFields: {
      name: {
        type: 'string',
        required: false,
      },
    },
  },
  advanced: {
    cookiePrefix: 'minicalen',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  trustedOrigins: getAllowedOrigins(),
});

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  // Development origins
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  
  // Production origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...envOrigins);
  } else if (process.env.MINICALEN_HOST) {
    const protocol = process.env.USE_HTTPS === 'true' ? 'https' : 'http';
    origins.push(`${protocol}://${process.env.MINICALEN_HOST}`);
  }
  
  return origins;
}

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
