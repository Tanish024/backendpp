import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { runWithTenant } from '../lib/tenant-context.js';

export function authWorkspace(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }
  const decoded = jwt.verify(header.slice(7), env.JWT_SECRET);
  if (!decoded.wid) {
    throw new AppError(403, 'Workspace-scoped token required');
  }
  req.auth = { userId: decoded.sub, workspaceId: decoded.wid, role: decoded.role };
  runWithTenant({ workspaceId: decoded.wid }, () => next());
}
