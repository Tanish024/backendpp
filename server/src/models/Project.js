import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const projectSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, uppercase: true, trim: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true },
);

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
projectSchema.plugin(tenantPlugin);

export const Project = mongoose.model('Project', projectSchema);
