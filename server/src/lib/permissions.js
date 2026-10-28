import { AppError } from './errors.js';

const MATRIX = {
  owner:  new Set(['*']),
  admin:  new Set([
    'workspace:read', 'workspace:update',
    'member:read', 'member:invite', 'member:remove', 'member:updateRole',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'sprint:create', 'sprint:read', 'sprint:update', 'sprint:delete',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign',
    'comment:create', 'comment:read', 'comment:update', 'comment:delete',
    'timelog:create', 'timelog:read', 'timelog:readAll', 'timelog:update', 'timelog:delete',
    'invite:create', 'invite:read', 'invite:delete',
    'report:view',
  ]),
  member: new Set([
    'workspace:read',
    'member:read',
    'project:read', 'project:create',
    'sprint:read',
    'task:create', 'task:read', 'task:update', 'task:assign',
    'comment:create', 'comment:read', 'comment:update',
    'timelog:create', 'timelog:read', 'timelog:update', 'timelog:delete',
    'invite:read',
    'report:view',
  ]),
  guest:  new Set([
    'workspace:read',
    'member:read',
    'project:read',
    'sprint:read',
    'task:read',
    'comment:create', 'comment:read',
  ]),
};

export function can(role, action) {
  if (!role || !action) return false;
  const perms = MATRIX[role];
  if (!(perms instanceof Set)) return false;
  return perms.has('*') || perms.has(action);
}

export function requirePermission(action) {
  return (req, _res, next) => {
    if (!can(req.auth?.role, action)) {
      throw new AppError(403, 'Forbidden');
    }
    next();
  };
}
