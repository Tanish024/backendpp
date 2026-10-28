import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { Membership } from '../src/models/Membership.js';
import { runWithTenant } from '../src/lib/tenant-context.js';

async function setup() {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Owner', email: 'owner@t.com', password: 'password123' });
  const ws = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: 'WS', slug: 'mem-ws' });
  const reg2 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Member', email: 'mem@t.com', password: 'password123' });
  await runWithTenant({ workspaceId: ws.body.workspace._id }, () =>
    Membership.create({ workspaceId: ws.body.workspace._id, userId: reg2.body.user._id, role: 'member' }),
  );
  return {
    ownerToken: ws.body.token,
    workspace: ws.body.workspace,
    memberId: reg2.body.user._id,
    memberUserToken: reg2.body.token,
  };
}

describe('Member routes', () => {
  it('lists members', async () => {
    const { ownerToken } = await setup();
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.members.length).toBeGreaterThanOrEqual(2);
  });

  it('owner changes member role', async () => {
    const { ownerToken, memberId } = await setup();
    const res = await request(app)
      .patch(`/api/members/${memberId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('admin');
  });

  it('cannot demote owner', async () => {
    const { ownerToken, workspace } = await setup();
    const decoded = jwt.decode(ownerToken);
    const res = await request(app)
      .patch(`/api/members/${decoded.sub}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'member' });
    expect(res.status).toBe(403);
  });

  it('cannot remove owner', async () => {
    const { ownerToken } = await setup();
    const decoded = jwt.decode(ownerToken);
    const res = await request(app)
      .delete(`/api/members/${decoded.sub}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  it('guest cannot change roles', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'G', email: 'guest@t.com', password: 'password123' });
    const ws = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ name: 'GWS', slug: 'guest-ws' });
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'G2', email: 'guest2@t.com', password: 'password123' });
    await runWithTenant({ escape: 'authBypass' }, () =>
      Membership.create({ workspaceId: ws.body.workspace._id, userId: reg2.body.user._id, role: 'guest' }),
    );
    const switchRes = await request(app)
      .post(`/api/workspaces/${ws.body.workspace._id}/switch`)
      .set('Authorization', `Bearer ${reg2.body.token}`);
    expect(switchRes.status).toBe(200);
    const guestToken = switchRes.body.token;
    const res = await request(app)
      .patch(`/api/members/${reg.body.user._id}/role`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ role: 'member' });
    expect(res.status).toBe(403);
  });

  it('cross-workspace access impossible – member list from other workspace returns nothing', async () => {
    const { ownerToken } = await setup();
    const reg3 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'other@t.com', password: 'password123' });
    const ws2 = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg3.body.token}`)
      .send({ name: 'Other WS', slug: 'other-ws' });
    // Use ownerToken (workspace 1) – should NOT see workspace 2 members
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${ownerToken}`);
    const wsId = jwt.decode(ownerToken).wid;
    for (const m of res.body.members) {
      expect(m.workspaceId.toString()).toBe(wsId);
    }
  });

  it('workspaceId in body is ignored on role update', async () => {
    const { ownerToken, memberId, workspace } = await setup();
    const reg3 = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Fake', email: 'fake@t.com', password: 'password123' });
    const ws2 = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${reg3.body.token}`)
      .send({ name: 'Fake WS', slug: 'fake-ws' });
    // Try to inject a different workspaceId in body
    const res = await request(app)
      .patch(`/api/members/${memberId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin', workspaceId: ws2.body.workspace._id });
    expect(res.status).toBe(200);
    // The change happened in ownerToken's workspace, not the injected one
    expect(res.body.member.workspaceId.toString()).toBe(workspace._id.toString());
  });
});
