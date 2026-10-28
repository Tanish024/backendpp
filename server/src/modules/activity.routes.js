import { Router } from 'express';
import { Activity } from '../models/Activity.js';
import { authWorkspace } from '../middleware/auth-workspace.js';

const router = Router();
router.use(authWorkspace);

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.entityId) filter.entityId = req.query.entityId;
  const activities = await Activity.find(filter)
    .populate('actorId', 'name email')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ activities });
});

export { router as activityRouter };
