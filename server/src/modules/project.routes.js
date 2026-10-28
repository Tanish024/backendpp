import { Router } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(authWorkspace);

const projectSchema = z.object({
  name: z.string().min(1).trim(),
  key: z.string().min(1).max(10).trim().toUpperCase(),
  leadId: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

router.get('/', requirePermission('project:read'), async (_req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json({ projects });
});

router.post('/', requirePermission('project:create'), async (req, res) => {
  const data = projectSchema.parse(req.body);
  const existing = await Project.findOne({ key: data.key });
  if (existing) throw new AppError(409, 'Project key already exists in workspace');
  const project = await Project.create({ ...data, leadId: data.leadId || req.auth.userId });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'project',
    entityId: project._id,
    action: 'created',
    meta: { name: project.name, key: project.key },
  });
  res.status(201).json({ project });
});

router.get('/:id', requirePermission('project:read'), async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, 'Project not found');
  res.json({ project });
});

router.patch('/:id', requirePermission('project:update'), async (req, res) => {
  const data = projectSchema.partial().parse(req.body);
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, 'Project not found');
  if (data.key && data.key !== project.key) {
    const existing = await Project.findOne({ key: data.key, _id: { $ne: project._id } });
    if (existing) throw new AppError(409, 'Project key already in use');
  }
  Object.assign(project, data);
  await project.save();
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'project',
    entityId: project._id,
    action: 'updated',
    meta: data,
  });
  res.json({ project });
});

router.delete('/:id', requirePermission('project:delete'), async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, 'Project not found');
  await Project.deleteOne({ _id: project._id });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'project',
    entityId: project._id,
    action: 'deleted',
  });
  res.json({ removed: true });
});

export { router as projectRouter };
