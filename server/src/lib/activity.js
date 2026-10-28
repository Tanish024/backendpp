import { Activity } from '../models/Activity.js';

export async function logActivity({ actorId, entityType, entityId, action, meta = {} }) {
  try {
    return await Activity.create({
      actorId,
      entityType,
      entityId,
      action,
      meta,
    });
  } catch (_err) {
    return null;
  }
}
