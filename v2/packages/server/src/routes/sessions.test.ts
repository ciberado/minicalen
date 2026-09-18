import request from 'supertest';
import type { Express } from 'express';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { createTestContext } from '../test/helpers';

function buildApp(): Express {
  return createApp(createTestContext());
}

function snapshot() {
  return {
    schemaVersion: 1,
    categories: [
      {
        id: 'c1',
        type: 'foreground',
        label: 'Work',
        color: '#2196F3',
        order: 0,
        active: true,
        visible: true,
      },
    ],
    dateMarks: { '2026-01-01': { categoryId: 'c1', textCategoryIds: [] } },
  };
}

async function signUp(app: Express, email: string) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/sign-up/email')
    .send({ email, password: 'password-1234', name: email.split('@')[0] });

  expect(response.status).toBe(200);

  return agent;
}

describe('sessions API', () => {
  it('creates anonymous sessions without authentication', async () => {
    const app = buildApp();
    const response = await request(app).post('/api/sessions').send({ name: 'Anon' });

    expect(response.status).toBe(201);
    expect(response.body.session).toMatchObject({ name: 'Anon', isAnonymous: true });
  });

  it('hides private sessions from anonymous readers', async () => {
    const app = buildApp();
    const created = await request(app).post('/api/sessions').send({ name: 'Anon' });

    const response = await request(app).get(`/api/sessions/${created.body.session.id}`);

    expect(response.status).toBe(404);
  });

  it('lists owned sessions for authenticated users', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');

    const created = await owner.post('/api/sessions').send({ name: 'Mine' });
    const list = await owner.get('/api/sessions');

    expect(created.body.session.isAnonymous).toBe(false);
    expect(list.status).toBe(200);
    expect(list.body.sessions).toHaveLength(1);
    expect(list.body.sessions[0]).toMatchObject({ name: 'Mine', accessLevel: 'owner' });
  });

  it('requires authentication to list sessions', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/sessions');
    expect(response.status).toBe(401);
  });

  it('shares a session with a viewer who can read but not edit', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');
    const viewer = await signUp(app, 'viewer@example.com');

    const created = await owner.post('/api/sessions').send({ name: 'Shared' });
    const id = created.body.session.id;

    const share = await owner
      .post(`/api/sessions/${id}/share`)
      .send({ email: 'viewer@example.com', accessLevel: 'viewer' });
    expect(share.status).toBe(200);

    const read = await viewer.get(`/api/sessions/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.accessLevel).toBe('viewer');

    const write = await viewer.put(`/api/sessions/${id}/state`).send(snapshot());
    expect(write.status).toBe(403);

    const list = await viewer.get('/api/sessions');
    expect(list.body.sessions[0]).toMatchObject({ id, accessLevel: 'viewer' });
  });

  it('lets editors update state but not share', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');
    const editor = await signUp(app, 'editor@example.com');

    const created = await owner.post('/api/sessions').send({ name: 'Editable' });
    const id = created.body.session.id;

    await owner
      .post(`/api/sessions/${id}/share`)
      .send({ email: 'editor@example.com', accessLevel: 'editor' });

    const write = await editor.put(`/api/sessions/${id}/state`).send(snapshot());
    expect(write.status).toBe(200);

    const read = await editor.get(`/api/sessions/${id}/state`);
    expect(read.body.snapshot).toEqual(snapshot());

    const share = await editor
      .post(`/api/sessions/${id}/share`)
      .send({ email: 'owner@example.com', accessLevel: 'viewer' });
    expect(share.status).toBe(403);
  });

  it('rejects sharing with unknown users', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');
    const created = await owner.post('/api/sessions').send({ name: 'X' });

    const response = await owner
      .post(`/api/sessions/${created.body.session.id}/share`)
      .send({ email: 'ghost@example.com', accessLevel: 'viewer' });

    expect(response.status).toBe(404);
  });

  it('claims anonymous sessions', async () => {
    const app = buildApp();
    const user = await signUp(app, 'claimer@example.com');
    const created = await request(app).post('/api/sessions').send({ name: 'Anon' });
    const id = created.body.session.id;

    const claim = await user.post(`/api/sessions/${id}/claim`);
    expect(claim.status).toBe(200);
    expect(claim.body.session).toMatchObject({ id, isAnonymous: false });

    const again = await user.post(`/api/sessions/${id}/claim`);
    expect(again.status).toBe(409);
  });

  it('only lets the owner delete a session', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');
    const other = await signUp(app, 'other@example.com');

    const created = await owner.post('/api/sessions').send({ name: 'Doomed' });
    const id = created.body.session.id;

    expect((await other.delete(`/api/sessions/${id}`)).status).toBe(404);
    expect((await owner.delete(`/api/sessions/${id}`)).status).toBe(200);
    expect((await owner.get(`/api/sessions/${id}`)).status).toBe(404);
  });

  it('renames sessions for editors', async () => {
    const app = buildApp();
    const owner = await signUp(app, 'owner@example.com');
    const created = await owner.post('/api/sessions').send({ name: 'Old' });

    const response = await owner
      .patch(`/api/sessions/${created.body.session.id}`)
      .send({ name: 'New' });

    expect(response.status).toBe(200);
    expect(response.body.session.name).toBe('New');
  });
});
