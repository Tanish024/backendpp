import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Workspace } from '../models/Workspace.js';
import { Membership } from '../models/Membership.js';
import { AppError } from '../lib/errors.js';
import { authUser } from '../middleware/auth-user.js';
import { runWithTenant } from '../lib/tenant-context.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
});

router.post('/', authUser, async (req, res) => {
  const { name, slug } = createSchema.parse(req.body);
  const existing = await Workspace.findOne({ slug });
  if (existing) throw new AppError(409, 'Slug already taken');
  const wsId = new mongoose.Types.ObjectId();
  const workspace = await Workspace.create({ _id: wsId, name, slug, ownerId: req.auth.userId });
  await runWithTenant({ escape: 'authBypass' }, () =>
    Membership.create({ workspaceId: wsId, userId: req.auth.userId, role: 'owner' }),
  );
  const token = jwt.sign(
    { sub: req.auth.userId, wid: wsId.toString(), role: 'owner' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
  res.status(201).json({ workspace, token });
});

router.get('/', authUser, async (req, res) => {
  const memberships = await runWithTenant({ escape: 'authBypass' }, () =>
    Membership.find({ userId: req.auth.userId, status: 'active' }).lean(),
  );
  const wsIds = memberships.map((m) => m.workspaceId);
  const workspaces = await Workspace.find({ _id: { $in: wsIds } }).lean();
  res.json({ workspaces });
});

router.post('/:id/switch', authUser, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError(403, 'Not a member of this workspace');
  }
  const membership = await runWithTenant({ escape: 'switchWorkspace' }, () =>
    Membership.findOne({ workspaceId: req.params.id, userId: req.auth.userId, status: 'active' }),
  );
  if (!membership) throw new AppError(403, 'Not a member of this workspace');
  const token = jwt.sign(
    { sub: req.auth.userId, wid: membership.workspaceId.toString(), role: membership.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
  res.json({ token, role: membership.role });
});

export { router as workspaceRouter };
