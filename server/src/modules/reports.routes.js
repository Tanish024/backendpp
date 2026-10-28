import { Router } from 'express';
import mongoose from 'mongoose';
import { Sprint } from '../models/Sprint.js';
import { Task } from '../models/Task.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';

const router = Router();
router.use(authWorkspace);
router.use(requirePermission('report:view'));

// GET /api/reports/burndown?sprintId= : daily remaining estimateHours vs an ideal line
router.get('/burndown', async (req, res) => {
  const { sprintId } = req.query;
  if (!sprintId) throw new AppError(400, 'sprintId is required');

  const sprint = await Sprint.findById(sprintId);
  if (!sprint) throw new AppError(404, 'Sprint not found');

  const tasks = await Task.find({ sprintId: sprint._id });
  const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0);

  const start = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
  const end = sprint.endDate
    ? new Date(sprint.endDate)
    : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

  const oneDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((end - start) / oneDay));
  const days = [];

  for (let i = 0; i <= totalDays; i++) {
    const current = new Date(start.getTime() + i * oneDay);
    const dateStr = current.toISOString().slice(0, 10);
    const ideal = Math.max(0, +(totalEstimate - (totalEstimate / totalDays) * i).toFixed(2));

    const remaining = tasks
      .filter((t) => !t.completedAt || new Date(t.completedAt) > current)
      .reduce((sum, t) => sum + (t.estimateHours || 0), 0);

    days.push({
      date: dateStr,
      idealRemaining: ideal,
      remainingEstimateHours: +remaining.toFixed(2),
    });
  }

  res.json({
    sprintId: sprint._id,
    sprintName: sprint.name,
    totalEstimate,
    burndown: days,
  });
});

// GET /api/reports/velocity?projectId= : completed hours per completed sprint
router.get('/velocity', async (req, res) => {
  const filter = { status: 'completed' };
  if (req.query.projectId) {
    filter.projectId = new mongoose.Types.ObjectId(req.query.projectId);
  }

  const sprints = await Sprint.find(filter).sort({ endDate: 1, createdAt: 1 });
  const sprintIds = sprints.map((s) => new mongoose.Types.ObjectId(s._id));

  const completed = await Task.aggregate([
    {
      $match: {
        sprintId: { $in: sprintIds },
        status: 'done',
      },
    },
    {
      $group: {
        _id: '$sprintId',
        completedHours: { $sum: { $ifNull: ['$estimateHours', 0] } },
        taskCount: { $sum: 1 },
      },
    },
  ]);

  const map = new Map(completed.map((c) => [c._id.toString(), c]));

  const velocity = sprints.map((s) => ({
    sprintId: s._id,
    sprintName: s.name,
    completedHours: map.get(s._id.toString())?.completedHours || 0,
    taskCount: map.get(s._id.toString())?.taskCount || 0,
  }));

  res.json({ velocity });
});

// GET /api/reports/workload : open estimate hours and task count per assignee
router.get('/workload', async (_req, res) => {
  const workload = await Task.aggregate([
    { $match: { status: { $ne: 'done' } } },
    {
      $group: {
        _id: '$assigneeId',
        openHours: { $sum: { $ifNull: ['$estimateHours', 0] } },
        taskCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $project: {
        assigneeId: '$_id',
        openHours: 1,
        taskCount: 1,
        user: { $arrayElemAt: ['$user', 0] },
      },
    },
    {
      $project: {
        assigneeId: 1,
        openHours: 1,
        taskCount: 1,
        assigneeName: { $ifNull: ['$user.name', 'Unassigned'] },
        assigneeEmail: '$user.email',
      },
    },
    { $sort: { openHours: -1 } },
  ]);

  res.json({ workload });
});

// GET /api/reports/overdue : overdue tasks
router.get('/overdue', async (_req, res) => {
  const tasks = await Task.find({
    status: { $ne: 'done' },
    dueDate: { $ne: null, $lt: new Date() },
  })
    .populate('assigneeId', 'name email')
    .populate('projectId', 'name key')
    .sort({ dueDate: 1 });

  res.json({ tasks });
});

export { router as reportsRouter };
