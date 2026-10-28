import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });
notificationSchema.plugin(tenantPlugin);

export const Notification = mongoose.model('Notification', notificationSchema);
