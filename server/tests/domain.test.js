import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Membership } from '../src/models/Membership.js';
import { runWithTenant } from '../src/lib/tenant-context.js';

async function setupWorkspace(prefix = 'dom') {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: `${prefix} Owner`, email: `${prefix}_owner@test.com`, password: 'password123' });
  const ws = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: `${prefix} WS`, slug: `${prefix}-ws` });
  const reg2 = await request(app)
    .post('/api/auth/register')
    .send({ name: `${prefix} Member`, email: `${prefix}_member@test.com`, password: 'password123' });
  await runWithTenant({ escape: 'authBypass' }, () =>
    Membership.create({ workspaceId: ws.body.workspace._id, userId: reg2.body.user._id, role: 'member' }),
  );
  const switchRes = await request(app)
    .post(`/api/workspaces/${ws.body.workspace._id}/switch`)
    .set('Authorization', `Bearer ${reg2.body.token}`);
  return {
    ownerToken: ws.body.token,
    memberToken: switchRes.body.token,
    ownerUser: reg.body.user,
    memberUser: reg2.body.user,
    workspace: ws.body.workspace,
  };
}

describe('Part 3 Domain API', () => {
  it('manages projects with duplicate key rejection and activity logging', async () => {
    const { ownerToken } = await setupWorkspace('proj');
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Platform', key: 'PLAT' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.project.key).toBe('PLAT');

    const dupRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Platform 2', key: 'PLAT' });
    expect(dupRes.status).toBe(409);

    const listRes = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.projects).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`/api/projects/${createRes.body.project._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Platform Core' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.project.name).toBe('Platform Core');
  });

  it('manages sprints under a project', async () => {
    const { ownerToken } = await setupWorkspace('spr');
    const proj = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'App', key: 'APP' });

    const createSprint = await request(app)
      .post('/api/sprints')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ projectId: proj.body.project._id, name: 'Sprint 1', status: 'planned' });
    expect(createSprint.status).toBe(201);
    expect(createSprint.body.sprint.name).toBe('Sprint 1');

    const listSprint = await request(app)
      .get(`/api/sprints?projectId=${proj.body.project._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listSprint.status).toBe(200);
    expect(listSprint.body.sprints).toHaveLength(1);

    const updateSprint = await request(app)
      .patch(`/api/sprints/${createSprint.body.sprint._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'active' });
    expect(updateSprint.status).toBe(200);
    expect(updateSprint.body.sprint.status).toBe('active');
  });

  it('manages tasks and reorders using fractional-indexing via PATCH /api/tasks/:id/move', async () => {
    const { ownerToken, memberToken, memberUser } = await setupWorkspace('task');
    const proj = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'TaskProj', key: 'TP' });
    const pId = proj.body.project._id;

    const t1 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId: pId, title: 'Task 1' });
    const t2 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId: pId, title: 'Task 2' });
    const t3 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ projectId: pId, title: 'Task 3' });

    expect(t1.status).toBe(201);
    expect(t2.status).toBe(201);
    expect(t3.status).toBe(201);
    expect(t1.body.task.order < t2.body.task.order).toBe(true);
    expect(t2.body.task.order < t3.body.task.order).toBe(true);

    // Move task 3 between task 1 and task 2
    const moveRes = await request(app)
      .patch(`/api/tasks/${t3.body.task._id}/move`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        prevOrder: t1.body.task.order,
        nextOrder: t2.body.task.order,
        status: 'in_progress',
      });
    expect(moveRes.status).toBe(200);
    expect(moveRes.body.task.status).toBe('in_progress');
    expect(moveRes.body.task.order > t1.body.task.order).toBe(true);
    expect(moveRes.body.task.order < t2.body.task.order).toBe(true);

    // Move task to done updates completedAt
    const moveDone = await request(app)
      .patch(`/api/tasks/${t1.body.task._id}/move`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'done' });
    expect(moveDone.status).toBe(200);
    expect(moveDone.body.task.completedAt).toBeDefined();

    // Assign task
    const assignRes = await request(app)
      .patch(`/api/tasks/${t1.body.task._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assigneeId: memberUser._id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.task.assigneeId).toBe(memberUser._id);
  });

  it('creates comments with @mentions and triggers notifications', async () => {
    const { ownerToken, memberToken, memberUser } = await setupWorkspace('com');
    const proj = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'ComProj', key: 'CP' });
    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ projectId: proj.body.project._id, title: 'Comment Task' });

    // Owner mentions member in comment
    const commentRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        taskId: task.body.task._id,
        body: `Please review this @${memberUser._id}`,
      });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.comment.mentions).toContain(memberUser._id);

    // Member checks notifications
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBeGreaterThanOrEqual(1);
    const mentionNotif = notifRes.body.notifications.find(
      (n) => n.refId === commentRes.body.comment._id,
    );
    expect(mentionNotif).toBeDefined();
    expect(mentionNotif.read).toBe(false);

    // Member marks notification read
    const readRes = await request(app)
      .patch(`/api/notifications/${mentionNotif._id}/read`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.notification.read).toBe(true);
  });

  it('manages time logs for tasks', async () => {
    const { ownerToken, memberToken } = await setupWorkspace('tl');
    const proj = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'TLProj', key: 'TLP' });
    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ projectId: proj.body.project._id, title: 'TL Task' });

    const logRes = await request(app)
      .post('/api/timelogs')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ taskId: task.body.task._id, hours: 2.5, note: 'Initial design' });
    expect(logRes.status).toBe(201);
    expect(logRes.body.timeLog.hours).toBe(2.5);

    const listRes = await request(app)
      .get(`/api/timelogs?taskId=${task.body.task._id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.timeLogs).toHaveLength(1);

    const delRes = await request(app)
      .delete(`/api/timelogs/${logRes.body.timeLog._id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.removed).toBe(true);
  });

  it('records activities and enforces cross-workspace tenant isolation', async () => {
    const ws1 = await setupWorkspace('iso1');
    const ws2 = await setupWorkspace('iso2');

    const p1 = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ws1.ownerToken}`)
      .send({ name: 'WS1 Proj', key: 'W1P' });

    // WS1 activities contain created project
    const actRes = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${ws1.ownerToken}`);
    expect(actRes.status).toBe(200);
    expect(actRes.body.activities.some((a) => a.entityId === p1.body.project._id)).toBe(true);

    // WS2 cannot see or access WS1 project
    const p1FromWs2 = await request(app)
      .get(`/api/projects/${p1.body.project._id}`)
      .set('Authorization', `Bearer ${ws2.ownerToken}`);
    expect(p1FromWs2.status).toBe(404);

    const listWs2 = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${ws2.ownerToken}`);
    expect(listWs2.body.projects.some((p) => p._id === p1.body.project._id)).toBe(false);
  });
});
