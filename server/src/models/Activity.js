import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const activitySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.plugin(tenantPlugin);

export const Activity = mongoose.model('Activity', activitySchema);
