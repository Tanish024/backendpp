import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const timeLogSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hours: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

timeLogSchema.plugin(tenantPlugin);

export const TimeLog = mongoose.model('TimeLog', timeLogSchema);
