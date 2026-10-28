import mongoose from 'mongoose';
import { getTenantContextOrNull } from './tenant-context.js';

const ESCAPE_HATCHES = new Set([
  'authBypass',
  'switchWorkspace',
  'acceptInvite',
]);

function injectWorkspaceId(query, methodName) {
  const ctx = getTenantContextOrNull();
  if (!ctx) {
    throw new Error(`Tenant context required for ${methodName}(). Wrap in runWithTenant() or use an escape hatch.`);
  }
  if (ESCAPE_HATCHES.has(ctx.escape)) return;
  query.where({ workspaceId: ctx.workspaceId });
}

export function tenantPlugin(schema) {
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
    'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
    'countDocuments'], function () {
    injectWorkspaceId(this, this.op);
  });

  schema.pre('aggregate', function () {
    const ctx = getTenantContextOrNull();
    if (!ctx) {
      throw new Error('Tenant context required for aggregate(). Wrap in runWithTenant().');
    }
    if (ESCAPE_HATCHES.has(ctx.escape)) return;
    const wsId = mongoose.Types.ObjectId.isValid(ctx.workspaceId)
      ? new mongoose.Types.ObjectId(ctx.workspaceId)
      : ctx.workspaceId;
    this.pipeline().unshift({ $match: { workspaceId: wsId } });
  });

  schema.pre('validate', function () {
    const ctx = getTenantContextOrNull();
    if (!ctx) {
      throw new Error('Tenant context required for validate(). Wrap in runWithTenant().');
    }
    if (ESCAPE_HATCHES.has(ctx.escape)) return;
    if (!this.workspaceId) {
      this.workspaceId = ctx.workspaceId;
    } else if (this.workspaceId.toString() !== ctx.workspaceId.toString()) {
      throw new Error('workspaceId mismatch on validate()');
    }
  });

  schema.pre('insertMany', function (next, docs) {
    const ctx = getTenantContextOrNull();
    if (!ctx) {
      throw new Error('Tenant context required for insertMany().');
    }
    if (ESCAPE_HATCHES.has(ctx.escape)) return next();
    for (const doc of docs) {
      if (!doc.workspaceId) doc.workspaceId = ctx.workspaceId;
    }
    next();
  });
}
