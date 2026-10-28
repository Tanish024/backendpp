import { Router } from 'express';
import { z } from 'zod';
import { Sprint } from '../models/Sprint.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(authWorkspace);

const sprintSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).trim(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['planned', 'active', 'completed']).optional(),
});

router.get('/', requirePermission('sprint:read'), async (req, res) => {
  const filter = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.status) filter.status = req.query.status;
  const sprints = await Sprint.find(filter).sort({ createdAt: -1 });
  res.json({ sprints });
});

router.post('/', requirePermission('sprint:create'), async (req, res) => {
  const data = sprintSchema.parse(req.body);
  const sprint = await Sprint.create(data);
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'sprint',
    entityId: sprint._id,
    action: 'created',
    meta: { name: sprint.name, projectId: sprint.projectId },
  });
  res.status(201).json({ sprint });
});

router.get('/:id', requirePermission('sprint:read'), async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new AppError(404, 'Sprint not found');
  res.json({ sprint });
});

router.patch('/:id', requirePermission('sprint:update'), async (req, res) => {
  const data = sprintSchema.partial().parse(req.body);
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new AppError(404, 'Sprint not found');
  Object.assign(sprint, data);
  await sprint.save();
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'sprint',
    entityId: sprint._id,
    action: 'updated',
    meta: data,
  });
  res.json({ sprint });
});

router.delete('/:id', requirePermission('sprint:delete'), async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) throw new AppError(404, 'Sprint not found');
  await Sprint.deleteOne({ _id: sprint._id });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'sprint',
    entityId: sprint._id,
    action: 'deleted',
  });
  res.json({ removed: true });
});

export { router as sprintRouter };
