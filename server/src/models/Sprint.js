import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const sprintSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  },
  { timestamps: true },
);

sprintSchema.plugin(tenantPlugin);

export const Sprint = mongoose.model('Sprint', sprintSchema);
