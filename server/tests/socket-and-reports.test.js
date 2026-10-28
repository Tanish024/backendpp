import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import { io as Client } from 'socket.io-client';
import { app } from '../src/app.js';
import { initSocket } from '../src/lib/socket.js';
import { Task } from '../src/models/Task.js';
import { Sprint } from '../src/models/Sprint.js';
import { runWithTenant } from '../src/lib/tenant-context.js';

let httpServer;
let serverPort;

beforeAll(async () => {
  httpServer = createServer(app);
  initSocket(httpServer);
  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

async function createWorkspaceWithToken(slug) {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: `${slug} User`, email: `${slug}@test.com`, password: 'password123' });
  const ws = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${reg.body.token}`)
    .send({ name: `${slug} Workspace`, slug });
  return {
    userToken: reg.body.token,
    wsToken: ws.body.token,
    workspace: ws.body.workspace,
    user: reg.body.user,
  };
}

describe('Part 4: Socket.io and Reports', () => {
  it('Socket: isolates workspace rooms; event in workspace A is never received in workspace B', async () => {
    const wsA = await createWorkspaceWithToken('sock-a');
    const wsB = await createWorkspaceWithToken('sock-b');

    const clientA = Client(`http://localhost:${serverPort}`, {
      auth: { token: wsA.wsToken },
      transports: ['websocket'],
    });

    const clientB = Client(`http://localhost:${serverPort}`, {
      auth: { token: wsB.wsToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => clientA.on('connect', resolve)),
      new Promise((resolve) => clientB.on('connect', resolve)),
    ]);

    // Create project and task in workspace A
    const projA = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${wsA.wsToken}`)
      .send({ name: 'Proj A', key: 'PRA' });

    const taskA = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${wsA.wsToken}`)
      .send({ projectId: projA.body.project._id, title: 'Task Socket A' });

    let bReceivedEvent = false;
    clientB.on('task:moved', () => {
      bReceivedEvent = true;
    });

    const receivedOnA = new Promise((resolve) => {
      clientA.on('task:moved', (payload) => {
        resolve(payload);
      });
    });

    // Move task in workspace A
    await request(app)
      .patch(`/api/tasks/${taskA.body.task._id}/move`)
      .set('Authorization', `Bearer ${wsA.wsToken}`)
      .send({ status: 'done' });

    const payloadA = await receivedOnA;
    expect(payloadA.task._id).toBe(taskA.body.task._id);
    expect(bReceivedEvent).toBe(false);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('Reports: burndown, velocity, workload, and overdue', async () => {
    const { wsToken, workspace, user } = await createWorkspaceWithToken('rep');

    const proj = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${wsToken}`)
      .send({ name: 'Report Project', key: 'RP' });
    const pId = proj.body.project._id;

    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-15');

    const sprint = await request(app)
      .post('/api/sprints')
      .set('Authorization', `Bearer ${wsToken}`)
      .send({
        projectId: pId,
        name: 'Sprint Alpha',
        startDate,
        endDate,
        status: 'completed',
      });
    const sId = sprint.body.sprint._id;

    // Seed tasks
    await runWithTenant({ workspaceId: workspace._id }, async () => {
      await Task.create({
        workspaceId: workspace._id,
        projectId: pId,
        sprintId: sId,
        title: 'Task Done',
        estimateHours: 8,
        status: 'done',
        order: 'a0',
        completedAt: new Date('2026-01-05'),
        assigneeId: user._id,
      });

      await Task.create({
        workspaceId: workspace._id,
        projectId: pId,
        sprintId: sId,
        title: 'Task Overdue',
        estimateHours: 5,
        status: 'in_progress',
        order: 'a1',
        dueDate: new Date('2026-01-02'),
        assigneeId: user._id,
      });
    });

    // 1. Burndown
    const burndownRes = await request(app)
      .get(`/api/reports/burndown?sprintId=${sId}`)
      .set('Authorization', `Bearer ${wsToken}`);
    expect(burndownRes.status).toBe(200);
    expect(burndownRes.body.totalEstimate).toBe(13);
    expect(burndownRes.body.burndown.length).toBeGreaterThanOrEqual(14);

    // 2. Velocity
    const velocityRes = await request(app)
      .get(`/api/reports/velocity?projectId=${pId}`)
      .set('Authorization', `Bearer ${wsToken}`);
    expect(velocityRes.status).toBe(200);
    expect(velocityRes.body.velocity).toHaveLength(1);
    expect(velocityRes.body.velocity[0].completedHours).toBe(8);

    // 3. Workload
    const workloadRes = await request(app)
      .get('/api/reports/workload')
      .set('Authorization', `Bearer ${wsToken}`);
    expect(workloadRes.status).toBe(200);
    const userWorkload = workloadRes.body.workload.find((w) => w.assigneeId === user._id);
    expect(userWorkload).toBeDefined();
    expect(userWorkload.openHours).toBe(5);
    expect(userWorkload.taskCount).toBe(1);

    // 4. Overdue
    const overdueRes = await request(app)
      .get('/api/reports/overdue')
      .set('Authorization', `Bearer ${wsToken}`);
    expect(overdueRes.status).toBe(200);
    expect(overdueRes.body.tasks.some((t) => t.title === 'Task Overdue')).toBe(true);
  });
});
