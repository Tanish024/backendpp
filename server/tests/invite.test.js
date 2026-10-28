import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { Invite } from '../src/models/Invite.js';
import { Membership } from '../src/models/Membership.js';
import { runWithTenant } from '../src/lib/tenant-context.js';

async function setupInvite() {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Owner', email: 'inv-owner@t.com', password: 'password123' });
  const ws = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: 'InvWS', slug: 'inv-ws' });
  return { ownerUserToken: reg.body.token, wsToken: ws.body.token, workspace: ws.body.workspace };
}

describe('Invite routes', () => {
  it('creates invite and stores only hash', async () => {
    const { wsToken, workspace } = await setupInvite();
    const res = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${wsToken}`)
      .send({ email: 'new@t.com', role: 'member' });
    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toBeDefined();
    expect(res.body.emailSent).toBe(false);
    const invite = await runWithTenant({ escape: 'acceptInvite' }, () =>
      Invite.findOne({ email: 'new@t.com' }).lean(),
    );
    expect(invite.tokenHash).toBeDefined();
    expect(invite.tokenHash.length).toBe(64); // sha256 hex
  });

  it('accept invite creates membership', async () => {
    const { wsToken, workspace } = await setupInvite();
    // Manually create invite with known token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await runWithTenant({ workspaceId: workspace._id }, () =>
      Invite.create({
        email: 'joiner@t.com',
        role: 'member',
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 3600000),
        invitedBy: jwt.decode(wsToken).sub,
      }),
    );
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Joiner', email: 'joiner@t.com', password: 'password123' });
    const res = await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ token, email: 'joiner@t.com' });
    expect(res.status).toBe(200);
    const membership = await runWithTenant({ escape: 'acceptInvite' }, () =>
      Membership.findOne({ workspaceId: workspace._id, userId: reg.body.user._id }),
    );
    expect(membership).toBeTruthy();
    expect(membership.role).toBe('member');
  });

  it('rejects expired invite', async () => {
    const { wsToken, workspace } = await setupInvite();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await runWithTenant({ workspaceId: workspace._id }, () =>
      Invite.create({
        email: 'exp@t.com',
        role: 'member',
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // expired
        invitedBy: jwt.decode(wsToken).sub,
      }),
    );
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Exp', email: 'exp@t.com', password: 'password123' });
    const res = await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ token, email: 'exp@t.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('rejects reused invite', async () => {
    const { wsToken, workspace } = await setupInvite();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await runWithTenant({ workspaceId: workspace._id }, () =>
      Invite.create({
        email: 'reuse@t.com',
        role: 'member',
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 3600000),
        usedAt: new Date(), // already used
        invitedBy: jwt.decode(wsToken).sub,
      }),
    );
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Reuse', email: 'reuse@t.com', password: 'password123' });
    const res = await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ token, email: 'reuse@t.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already used/i);
  });

  it('rejects tampered token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Tamp', email: 'tamp@t.com', password: 'password123' });
    const res = await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ token: 'tampered-token-value', email: 'tamp@t.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('rejects email mismatch', async () => {
    const { wsToken, workspace } = await setupInvite();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await runWithTenant({ workspaceId: workspace._id }, () =>
      Invite.create({
        email: 'real@t.com',
        role: 'member',
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 3600000),
        invitedBy: jwt.decode(wsToken).sub,
      }),
    );
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mis', email: 'wrong@t.com', password: 'password123' });
    const res = await request(app)
      .post('/api/invites/accept')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ token, email: 'wrong@t.com' });
    expect(res.status).toBe(400);
  });

  it('no-context query throws', async () => {
    await expect(Invite.find()).rejects.toThrow(/tenant context/i);
  });
});
