import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../lib/errors.js';
import { authUser } from '../middleware/auth-user.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signUserToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

router.post('/register', async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, 'Email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const token = signUserToken(user._id.toString());
  res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, 'Invalid credentials');
  const token = signUserToken(user._id.toString());
  res.json({ token, user });
});

router.get('/me', authUser, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user });
});

export { router as authRouter };
