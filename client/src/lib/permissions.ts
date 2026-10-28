export type Role = 'owner' | 'admin' | 'member' | 'guest';

export const PERMISSIONS: Record<Role, string[]> = {
  owner: ['*'],
  admin: [
    'workspace:read', 'workspace:update',
    'member:read', 'member:invite', 'member:remove', 'member:updateRole',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'sprint:create', 'sprint:read', 'sprint:update', 'sprint:delete',
    'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign',
    'comment:create', 'comment:read', 'comment:update', 'comment:delete',
    'timelog:create', 'timelog:read', 'timelog:readAll', 'timelog:update', 'timelog:delete',
    'invite:create', 'invite:read', 'invite:delete',
    'report:view',
  ],
  member: [
    'workspace:read',
    'member:read',
    'project:read', 'project:create',
    'sprint:read',
    'task:create', 'task:read', 'task:update', 'task:assign',
    'comment:create', 'comment:read', 'comment:update',
    'timelog:create', 'timelog:read', 'timelog:update', 'timelog:delete',
    'invite:read',
    'report:view',
  ],
  guest: [
    'workspace:read',
    'member:read',
    'project:read',
    'sprint:read',
    'task:read',
    'comment:create', 'comment:read',
  ],
};

export function can(role: Role | undefined | null, action: string): boolean {
  if (!role || !action) return false;
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(action);
}
