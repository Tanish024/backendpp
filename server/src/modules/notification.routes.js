import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { AppError } from '../lib/errors.js';

const router = Router();
router.use(authWorkspace);

router.get('/', async (req, res) => {
  const notifications = await Notification.find({ userId: req.auth.userId })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ notifications });
});

router.patch('/:id/read', async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.auth.userId });
  if (!notification) throw new AppError(404, 'Notification not found');
  notification.read = true;
  await notification.save();
  res.json({ notification });
});

router.patch('/read-all', async (req, res) => {
  await Notification.updateMany({ userId: req.auth.userId, read: false }, { read: true });
  res.json({ updated: true });
});

export { router as notificationRouter };
