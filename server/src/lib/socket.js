import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (!decoded.wid) {
        return next(new Error('Workspace-scoped token required'));
      }
      socket.auth = { userId: decoded.sub, workspaceId: decoded.wid, role: decoded.role };
      next();
    } catch (_err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const room = `ws:${socket.auth.workspaceId}`;
    socket.join(room);
    logger.info({ workspaceId: socket.auth.workspaceId }, 'socket connected %s', socket.auth.workspaceId);
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToWorkspace(workspaceId, event, payload, actorSocketId) {
  if (!io) return;
  const room = `ws:${workspaceId}`;
  const data =
    typeof payload === 'object' && payload !== null
      ? { ...payload, actorSocketId: actorSocketId || null }
      : payload;

  if (actorSocketId) {
    io.to(room).except(actorSocketId).emit(event, data);
  } else {
    io.to(room).emit(event, data);
  }
}
