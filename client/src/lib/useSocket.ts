import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './store.ts';
import { setSocketId } from './api.ts';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const workspaceToken = useAuthStore((s) => s.workspaceToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketId(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = new URL(import.meta.env.VITE_API_URL).origin;
    const socket = io(socketUrl, {
      auth: { token: workspaceToken },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setSocketId(null);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('task:moved', (data: { task: unknown; actorSocketId?: string }) => {
      if (data?.actorSocketId && data.actorSocketId === socket.id) return;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    socket.on('task:updated', (data: { task: unknown; actorSocketId?: string }) => {
      if (data?.actorSocketId && data.actorSocketId === socket.id) return;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    socket.on('comment:new', (data: { comment: unknown; actorSocketId?: string }) => {
      if (data?.actorSocketId && data.actorSocketId === socket.id) return;
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketId(null);
      setIsConnected(false);
    };
  }, [workspaceToken, queryClient]);

  return { socket: socketRef.current, isConnected };
}
