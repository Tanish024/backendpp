import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use(
  pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID(),
  }),
);

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { authRouter } from './modules/auth.routes.js';
import { workspaceRouter } from './modules/workspace.routes.js';
import { memberRouter } from './modules/member.routes.js';
import { inviteRouter } from './modules/invite.routes.js';
import { projectRouter } from './modules/project.routes.js';
import { sprintRouter } from './modules/sprint.routes.js';
import { taskRouter } from './modules/task.routes.js';
import { commentRouter } from './modules/comment.routes.js';
import { timeLogRouter } from './modules/timelog.routes.js';
import { activityRouter } from './modules/activity.routes.js';
import { notificationRouter } from './modules/notification.routes.js';
import { reportsRouter } from './modules/reports.routes.js';

app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/members', memberRouter);
app.use('/api/invites', inviteRouter);
app.use('/api/projects', projectRouter);
app.use('/api/sprints', sprintRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/comments', commentRouter);
app.use('/api/timelogs', timeLogRouter);
app.use('/api/time', timeLogRouter);
app.use('/api/activities', activityRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
