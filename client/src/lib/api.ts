import axios from 'axios';
import { useAuthStore } from './store.ts';

let currentSocketId: string | null = null;

export function setSocketId(id: string | null) {
  currentSocketId = id;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const { workspaceToken, userToken } = useAuthStore.getState();
  const token = workspaceToken || userToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (currentSocketId) {
    config.headers['x-socket-id'] = currentSocketId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
