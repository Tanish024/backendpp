import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

async function registerAndCreateWorkspace(name, email, slug) {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'password123' });
  const ws = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: `${name} WS`, slug });
  return { userToken: reg.body.token, wsToken: ws.body.token, workspace: ws.body.workspace };
}

describe('Workspace routes', () => {
  it('creates workspace and returns workspace-scoped token', async () => {
    const { wsToken, workspace } = await registerAndCreateWorkspace('Owner', 'own@t.com', 'my-ws');
    expect(workspace.slug).toBe('my-ws');
    expect(wsToken).toBeDefined();
  });

  it('rejects duplicate slug', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@t.com', password: 'password123' });
    await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'A', slug: 'dup-slug' });
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'B', slug: 'dup-slug' });
    expect(res.status).toBe(409);
  });

  it('lists only workspaces user is member of', async () => {
    const { userToken } = await registerAndCreateWorkspace('U1', 'u1@t.com', 'ws-u1');
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'U2', email: 'u2@t.com', password: 'password123' });
    await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg2.body.token}`)
      .send({ name: 'U2 WS', slug: 'ws-u2' });

    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.body.workspaces).toHaveLength(1);
    expect(res.body.workspaces[0].slug).toBe('ws-u1');
  });

  it('switch returns workspace-scoped JWT', async () => {
    const { userToken, workspace } = await registerAndCreateWorkspace('Sw', 'sw@t.com', 'ws-sw');
    const res = await request(app)
      .post(`/api/workspaces/${workspace._id}/switch`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('owner');
  });

  it('switch rejects non-member', async () => {
    const { workspace } = await registerAndCreateWorkspace('A', 'a@t.com', 'ws-a');
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'B', email: 'b@t.com', password: 'password123' });
    const res = await request(app)
      .post(`/api/workspaces/${workspace._id}/switch`)
      .set('Authorization', `Bearer ${reg2.body.token}`);
    expect(res.status).toBe(403);
  });
});
