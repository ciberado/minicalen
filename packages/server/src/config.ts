import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

function resolveAppVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const manifest = JSON.parse(readFileSync(resolve(here, '../../../package.json'), 'utf8')) as {
      version?: string;
    };
    return manifest.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = resolveAppVersion();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  COLLAB_PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z.string().min(1).default('./data/minicalen.db'),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  MINICALEN_HOST: z.string().optional(),
});

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  collabPort: number;
  databaseUrl: string;
  authSecret: string;
  authBaseUrl: string;
  trustedOrigins: string[];
}

const DEV_SECRET = 'minicalen-development-secret-please-change';

function collectOrigins(parsed: z.infer<typeof envSchema>): string[] {
  const origins = new Set<string>();

  if (parsed.NODE_ENV !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }

  if (parsed.ALLOWED_ORIGINS) {
    for (const origin of parsed.ALLOWED_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) {
        origins.add(trimmed);
      }
    }
  }

  if (parsed.MINICALEN_HOST) {
    origins.add(`https://${parsed.MINICALEN_HOST}`);
    origins.add(`http://${parsed.MINICALEN_HOST}`);
  }

  return [...origins];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  if (parsed.NODE_ENV === 'production' && !parsed.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required in production (min 32 characters)');
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    collabPort: parsed.COLLAB_PORT,
    databaseUrl: parsed.DATABASE_URL,
    authSecret: parsed.BETTER_AUTH_SECRET ?? DEV_SECRET,
    authBaseUrl: parsed.BETTER_AUTH_URL ?? `http://localhost:${parsed.PORT}`,
    trustedOrigins: collectOrigins(parsed),
  };
}
