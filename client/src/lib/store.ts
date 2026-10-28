import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from './permissions.ts';

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  role: Role;
}

interface AuthState {
  userToken: string | null;
  workspaceToken: string | null;
  user: User | null;
  activeWorkspace: Workspace | null;
  setAuth: (token: string, user: User) => void;
  setWorkspace: (token: string, ws: Workspace) => void;
  clearWorkspace: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userToken: null,
      workspaceToken: null,
      user: null,
      activeWorkspace: null,
      setAuth: (userToken, user) => set({ userToken, user }),
      setWorkspace: (workspaceToken, activeWorkspace) => set({ workspaceToken, activeWorkspace }),
      clearWorkspace: () => set({ workspaceToken: null, activeWorkspace: null }),
      logout: () => set({ userToken: null, workspaceToken: null, user: null, activeWorkspace: null }),
    }),
    {
      name: 'bpp-auth-storage',
    },
  ),
);
