import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Invite } from '../models/Invite.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { AppError } from '../lib/errors.js';
import { authWorkspace } from '../middleware/auth-workspace.js';
import { authUser } from '../middleware/auth-user.js';
import { requirePermission } from '../lib/permissions.js';
import { sendInviteEmail, isSmtpConfigured } from '../lib/mailer.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { runWithTenant } from '../lib/tenant-context.js';
import { emitToWorkspace } from '../lib/socket.js';
import { Workspace } from '../models/Workspace.js';

const router = Router();

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']),
});

router.post('/', authWorkspace, requirePermission('invite:create'), async (req, res) => {
  const { email, role } = createInviteSchema.parse(req.body);
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await Invite.create({
    email,
    role,
    tokenHash,
    expiresAt,
    invitedBy: req.auth.userId,
  });

  const inviteUrl = `${env.CORS_ORIGIN}/invite?token=${token}&email=${encodeURIComponent(email)}`;

  const [inviter, workspace] = await Promise.all([
    User.findById(req.auth.userId).lean(),
    Workspace.findById(req.auth.workspaceId).lean(),
  ]);

  let emailSent = false;
  if (isSmtpConfigured) {
    try {
      await sendInviteEmail({
        to: email,
        workspaceName: workspace?.name ?? 'a workspace',
        inviterName: inviter?.name ?? 'A teammate',
        role,
        inviteUrl,
      });
      emailSent = true;
    } catch (err) {
      logger.error({ err: err.message }, 'Failed to send invite email');
    }
  } else {
    logger.info({ inviteUrl, email }, 'Invite link (SMTP not configured)');
  }

  res.status(201).json({ emailSent, inviteUrl });
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

router.post('/accept', authUser, async (req, res) => {
  const { token, email } = acceptInviteSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await runWithTenant({ escape: 'acceptInvite' }, () =>
    Invite.findOne({ tokenHash }),
  );
  if (!invite) throw new AppError(400, 'Invalid invite token');
  if (invite.email !== email.toLowerCase()) throw new AppError(400, 'Email mismatch');
  if (invite.usedAt) throw new AppError(400, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new AppError(400, 'Invite expired');

  const user = await User.findById(req.auth.userId);
  if (!user || user.email !== email.toLowerCase()) {
    throw new AppError(400, 'Email does not match your account');
  }

  await runWithTenant({ escape: 'acceptInvite' }, async () => {
    const existing = await Membership.findOne({
      workspaceId: invite.workspaceId,
      userId: req.auth.userId,
    });
    if (existing) throw new AppError(409, 'Already a member');

    await Membership.create({
      workspaceId: invite.workspaceId,
      userId: req.auth.userId,
      role: invite.role,
      invitedBy: invite.invitedBy,
      status: 'active',
    });

    const actorSocketId = req.headers['x-socket-id'] || req.body?.actorSocketId;
    emitToWorkspace(invite.workspaceId.toString(), 'member:joined', { userId: req.auth.userId, role: invite.role }, actorSocketId);

    invite.usedAt = new Date();
    await invite.save();
  });

  res.json({ message: 'Invite accepted' });
});

export { router as inviteRouter };
