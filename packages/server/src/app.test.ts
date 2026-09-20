import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createTestContext } from './test/helpers';

const rootManifest = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../package.json'), 'utf8'),
) as { version: string };

function buildApp() {
  const ctx = createTestContext();
  return { app: createApp(ctx), ...ctx };
}

describe('GET /health', () => {
  it('reports the service status, version and schema version', async () => {
    const { app } = buildApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      version: rootManifest.version,
      schemaVersion: 2,
    });
  });
});
