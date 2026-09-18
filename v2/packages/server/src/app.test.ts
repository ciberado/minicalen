import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createTestContext } from './test/helpers';

function buildApp() {
  const ctx = createTestContext();
  return { app: createApp(ctx), ...ctx };
}

describe('GET /health', () => {
  it('reports the service status and schema version', async () => {
    const { app } = buildApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', schemaVersion: 1 });
  });
});
