import { Router } from 'express';
import { z } from 'zod';
import { Membership } from '../models/Membership.js';
import { AppError } from '../lib/errors.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { requirePermission, can } from '../lib/permissions.js';

const router = Router();

router.use(authWorkspace);

router.get('/', requirePermission('member:read'), async (req, res) => {
  const members = await Membership.find().populate('userId', 'name email');
  res.json({ members });
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'guest']),
});

router.patch('/:userId/role', requirePermission('member:updateRole'), async (req, res) => {
  const { role } = updateRoleSchema.parse(req.body);
  const target = await Membership.findOne({ userId: req.params.userId });
  if (!target) throw new AppError(404, 'Member not found');
  if (target.role === 'owner') throw new AppError(403, 'Cannot change owner role');
  if (target.role === 'admin' && !can(req.auth.role, '*')) {
    throw new AppError(403, 'Only owner can modify admin');
  }
  target.role = role;
  await target.save();
  res.json({ member: target });
});

router.delete('/:userId', requirePermission('member:remove'), async (req, res) => {
  const target = await Membership.findOne({ userId: req.params.userId });
  if (!target) throw new AppError(404, 'Member not found');
  if (target.role === 'owner') throw new AppError(403, 'Cannot remove owner');
  if (target.role === 'admin' && !can(req.auth.role, '*')) {
    throw new AppError(403, 'Only owner can remove admin');
  }
  await Membership.deleteOne({ _id: target._id });
  res.json({ removed: true });
});

export { router as memberRouter };
