import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission } from '../lib/permissions.js';
import { AppError } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { emitToWorkspace } from '../lib/socket.js';

const router = Router();
router.use(authWorkspace);

const commentCreateSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().min(1).trim(),
  mentions: z.array(z.string()).optional(),
});

router.get('/', requirePermission('comment:read'), async (req, res) => {
  const filter = {};
  if (req.query.taskId) filter.taskId = req.query.taskId;
  const comments = await Comment.find(filter)
    .populate('authorId', 'name email')
    .sort({ createdAt: 1 });
  res.json({ comments });
});

router.post('/', requirePermission('comment:create'), async (req, res) => {
  const data = commentCreateSchema.parse(req.body);
  const task = await Task.findById(data.taskId);
  if (!task) throw new AppError(404, 'Task not found');

  const mentionIds = new Set(data.mentions || []);
  const textMatches = data.body.match(/@([a-zA-Z0-9_.-]+)/g) || [];
  for (const raw of textMatches) {
    const handle = raw.slice(1);
    if (mongoose.Types.ObjectId.isValid(handle)) {
      mentionIds.add(handle);
    } else {
      const user = await User.findOne({
        $or: [
          { name: new RegExp(`^${handle}$`, 'i') },
          { email: new RegExp(`^${handle}@`, 'i') },
        ],
      });
      if (user) mentionIds.add(user._id.toString());
    }
  }

  const mentions = Array.from(mentionIds).map((id) => new mongoose.Types.ObjectId(id));
  const comment = await Comment.create({
    taskId: task._id,
    authorId: req.auth.userId,
    body: data.body,
    mentions,
  });

  const actorSocketId = req.headers['x-socket-id'] || req.body?.actorSocketId;
  emitToWorkspace(req.auth.workspaceId, 'comment:new', { comment }, actorSocketId);

  for (const uid of mentions) {
    if (uid.toString() !== req.auth.userId.toString()) {
      const notification = await Notification.create({
        userId: uid,
        type: 'mention',
        refId: comment._id,
        read: false,
      });
      emitToWorkspace(req.auth.workspaceId, 'notification:new', { notification }, actorSocketId);
    }
  }

  await logActivity({
    actorId: req.auth.userId,
    entityType: 'comment',
    entityId: comment._id,
    action: 'created',
    meta: { taskId: task._id },
  });

  res.status(201).json({ comment });
});

router.patch('/:id', requirePermission('comment:update'), async (req, res) => {
  const { body } = z.object({ body: z.string().min(1).trim() }).parse(req.body);
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new AppError(404, 'Comment not found');
  if (
    comment.authorId.toString() !== req.auth.userId.toString() &&
    req.auth.role !== 'owner' &&
    req.auth.role !== 'admin'
  ) {
    throw new AppError(403, 'Forbidden to update comment');
  }
  comment.body = body;
  await comment.save();
  res.json({ comment });
});

router.delete('/:id', requirePermission('comment:delete'), async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new AppError(404, 'Comment not found');
  if (
    comment.authorId.toString() !== req.auth.userId.toString() &&
    req.auth.role !== 'owner' &&
    req.auth.role !== 'admin'
  ) {
    throw new AppError(403, 'Forbidden to delete comment');
  }
  await Comment.deleteOne({ _id: comment._id });
  res.json({ removed: true });
});

export { router as commentRouter };
