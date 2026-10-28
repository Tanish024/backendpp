import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/store.ts';

export function RequireAuth() {
  const userToken = useAuthStore((s) => s.userToken);
  if (!userToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function RequireWorkspace() {
  const userToken = useAuthStore((s) => s.userToken);
  const workspaceToken = useAuthStore((s) => s.workspaceToken);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);

  if (!userToken) {
    return <Navigate to="/login" replace />;
  }
  if (!workspaceToken || !activeWorkspace) {
    return <Navigate to="/workspaces" replace />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const userToken = useAuthStore((s) => s.userToken);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);

  if (userToken) {
    return <Navigate to={activeWorkspace ? '/projects' : '/workspaces'} replace />;
  }
  return <Outlet />;
}
