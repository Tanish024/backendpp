import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export function authUser(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }
  const decoded = jwt.verify(header.slice(7), env.JWT_SECRET);
  req.auth = { userId: decoded.sub };
  next();
}
