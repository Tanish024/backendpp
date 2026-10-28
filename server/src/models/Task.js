import mongoose from 'mongoose';
import { tenantPlugin } from '../lib/tenant-plugin.js';

const taskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    sprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', index: true, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    labels: { type: [String], default: [] },
    order: { type: String, required: true },
    parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    dueDate: { type: Date, default: null },
    estimateHours: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ workspaceId: 1, projectId: 1, order: 1 });
taskSchema.plugin(tenantPlugin);

export const Task = mongoose.model('Task', taskSchema);
