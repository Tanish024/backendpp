import { Router } from 'express';
import { z } from 'zod';
import { generateKeyBetween } from 'fractional-indexing';
import { Task } from '../models/Task.js';
import { TimeLog } from '../models/TimeLog.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission, can } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { emitToWorkspace } from '../lib/socket.js';

const router = Router();
router.use(authWorkspace);

const taskCreateSchema = z.object({
  projectId: z.string().min(1),
  sprintId: z.string().nullable().optional(),
  title: z.string().min(1).trim(),
  description: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  labels: z.array(z.string()).optional(),
  order: z.string().optional(),
  parentTaskId: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimateHours: z.number().nullable().optional(),
});

const taskUpdateSchema = taskCreateSchema.partial();
const taskMoveSchema = z.object({
  prevOrder: z.string().nullable().optional(),
  nextOrder: z.string().nullable().optional(),
  beforeId: z.string().nullable().optional(),
  afterId: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  sprintId: z.string().nullable().optional(),
});
const timeLogInputSchema = z.object({
  hours: z.number().positive(),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
});

router.get('/', requirePermission('task:read'), async (req, res) => {
  const filter = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.sprintId !== undefined) {
    filter.sprintId = req.query.sprintId === 'null' ? null : req.query.sprintId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId;
  const tasks = await Task.find(filter)
    .populate('assigneeId', 'name email')
    .sort({ order: 1 });
  res.json({ tasks });
});

router.post('/', requirePermission('task:create'), async (req, res) => {
  const data = taskCreateSchema.parse(req.body);
  if (data.assigneeId && !can(req.auth.role, 'task:assign')) {
    throw new AppError(403, 'Forbidden to assign task');
  }
  let order = data.order;
  if (!order) {
    const lastTask = await Task.findOne({ projectId: data.projectId })
      .sort({ order: -1 })
      .select('order');
    order = generateKeyBetween(lastTask?.order || null, null);
  }
  const task = await Task.create({
    ...data,
    order,
    completedAt: data.status === 'done' ? new Date() : null,
  });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'task',
    entityId: task._id,
    action: 'created',
    meta: { title: task.title, projectId: task.projectId },
  });
  res.status(201).json({ task });
});

router.get('/:id', requirePermission('task:read'), async (req, res) => {
  const task = await Task.findById(req.params.id).populate('assigneeId', 'name email');
  if (!task) throw new AppError(404, 'Task not found');
  res.json({ task });
});

router.patch('/:id/move', requirePermission('task:update'), async (req, res) => {
  const { prevOrder: pO, nextOrder: nO, beforeId, afterId, status, sprintId } = taskMoveSchema.parse(req.body);
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, 'Task not found');

  let prevOrder = pO;
  let nextOrder = nO;
  if (beforeId && !prevOrder) {
    const bTask = await Task.findById(beforeId);
    prevOrder = bTask?.order || null;
  }
  if (afterId && !nextOrder) {
    const aTask = await Task.findById(afterId);
    nextOrder = aTask?.order || null;
  }

  const newOrder = generateKeyBetween(prevOrder || null, nextOrder || null);
  task.order = newOrder;

  if (status) {
    task.status = status;
    task.completedAt = status === 'done' ? new Date() : null;
  }
  if (sprintId !== undefined) {
    task.sprintId = sprintId || null;
  }
  await task.save();
  const actorSocketId = req.headers['x-socket-id'] || req.body?.actorSocketId;
  emitToWorkspace(req.auth.workspaceId, 'task:moved', { task }, actorSocketId);
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'task',
    entityId: task._id,
    action: 'moved',
    meta: { order: newOrder, status: task.status, sprintId: task.sprintId },
  });
  res.json({ task });
});

router.patch('/:id', requirePermission('task:update'), async (req, res) => {
  const data = taskUpdateSchema.parse(req.body);
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, 'Task not found');
  if (data.assigneeId !== undefined && data.assigneeId !== (task.assigneeId?.toString() || null)) {
    if (!can(req.auth.role, 'task:assign')) {
      throw new AppError(403, 'Forbidden to assign task');
    }
  }
  if (data.status) {
    data.completedAt = data.status === 'done' ? new Date() : null;
  }
  Object.assign(task, data);
  await task.save();
  const actorSocketId = req.headers['x-socket-id'] || req.body?.actorSocketId;
  emitToWorkspace(req.auth.workspaceId, 'task:updated', { task }, actorSocketId);
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'task',
    entityId: task._id,
    action: 'updated',
    meta: data,
  });
  res.json({ task });
});

router.post('/:id/time', requirePermission('timelog:create'), async (req, res) => {
  const data = timeLogInputSchema.parse(req.body);
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, 'Task not found');
  const timeLog = await TimeLog.create({
    taskId: task._id,
    userId: req.auth.userId,
    hours: data.hours,
    date: data.date || new Date(),
    note: data.note || '',
  });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'timelog',
    entityId: timeLog._id,
    action: 'created',
    meta: { taskId: task._id, hours: timeLog.hours },
  });
  res.status(201).json({ timeLog });
});

router.delete('/:id', requirePermission('task:delete'), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError(404, 'Task not found');
  await Task.deleteOne({ _id: task._id });
  await logActivity({
    actorId: req.auth.userId,
    entityType: 'task',
    entityId: task._id,
    action: 'deleted',
  });
  res.json({ removed: true });
});

export { router as taskRouter };
