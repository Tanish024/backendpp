import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

export function runWithTenant(ctx, fn) {
  return als.run(ctx, async () => {
    const result = await fn();
    return typeof result?.exec === 'function' ? result.exec() : result;
  });
}

export function getTenantContext() {
  const store = als.getStore();
  if (!store) {
    throw new Error('No tenant context – wrap call in runWithTenant()');
  }
  return store;
}

export function getTenantContextOrNull() {
  return als.getStore() ?? null;
}
