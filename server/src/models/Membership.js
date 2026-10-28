import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const membershipSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'pending'], default: 'active' },
  },
  { timestamps: true },
);

membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
membershipSchema.plugin(tenantPlugin);

export const Membership = mongoose.model('Membership', membershipSchema);
