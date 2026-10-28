import { Router } from 'express';
import { z } from 'zod';
import { TimeLog } from '../models/TimeLog.js';
import { Task } from '../models/Task.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission, can } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(authWorkspace);

const timeLogCreateSchema = z.object({
  taskId: z.string().min(1),
  hours: z.number().positive(),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
});

router.get('/', requirePermission('timelog:read'), async (req, res) => {
  const filter = {};
  if (req.query.taskId) filter.taskId = req.query.taskId;

  const canReadAll = can(req.auth?.role, 'timelog:readAll') || can(req.auth?.role, 'workspace:update');
  if (canReadAll) {
    if (req.query.userId) filter.userId = req.query.userId;
  } else {
    filter.userId = req.auth.userId;
  }

  const timeLogs = await TimeLog.find(filter)
    .populate('userId', 'name email')
    .sort({ date: -1 });
  res.json({ timeLogs });
});

router.post('/', requirePermission('timelog:create'), async (req, res) => {
  const data = timeLogCreateSchema.parse(req.body);
  const task = await Task.findById(data.taskId);
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

router.patch('/:id', requirePermission('timelog:update'), async (req, res) => {
  const data = timeLogCreateSchema.partial().parse(req.body);
  const timeLog = await TimeLog.findById(req.params.id);
  if (!timeLog) throw new AppError(404, 'Time log not found');
  if (
    timeLog.userId.toString() !== req.auth.userId.toString() &&
    !can(req.auth?.role, 'workspace:update')
  ) {
    throw new AppError(403, 'Forbidden to update time log');
  }
  Object.assign(timeLog, data);
  await timeLog.save();
  res.json({ timeLog });
});

router.delete('/:id', requirePermission('timelog:delete'), async (req, res) => {
  const timeLog = await TimeLog.findById(req.params.id);
  if (!timeLog) throw new AppError(404, 'Time log not found');
  if (
    timeLog.userId.toString() !== req.auth.userId.toString() &&
    !can(req.auth?.role, 'workspace:update')
  ) {
    throw new AppError(403, 'Forbidden to delete time log');
  }
  await TimeLog.deleteOne({ _id: timeLog._id });
  res.json({ removed: true });
});

export { router as timeLogRouter };
