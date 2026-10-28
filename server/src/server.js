import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initSocket } from './lib/socket.js';
import { verifyMailer } from './lib/mailer.js';

const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB');
  await verifyMailer();

  httpServer.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  });
}

export { httpServer, start };
