import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../shared/models/User.js';
import { Worker } from '../shared/models/Worker.js';
import { USER_ROLES } from '../shared/config/constants.js';
import { authenticate, signToken } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { AppError, asyncHandler, generateCode, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).max(100),
  role: z.enum(USER_ROLES).optional().default('worker'),
  phone: z.string().trim().max(30).optional().default(''),
  shift: z.enum(['morning', 'afternoon', 'night']).optional().default('morning')
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: req.body.role,
      phone: req.body.phone
    });

    let workerProfile = null;
    if (user.role === 'worker') {
      workerProfile = await Worker.create({
        userId: user._id,
        employeeCode: generateCode('WRK'),
        shift: req.body.shift,
        phone: req.body.phone
      });
    }

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Registered successfully',
      data: { token, user: safeUser, workerProfile }
    });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();

    const workerProfile = user.role === 'worker' ? await Worker.findOne({ userId: user._id }) : null;
    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    return sendSuccess(res, {
      message: 'Login successful',
      data: { token, user: safeUser, workerProfile }
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const workerProfile =
      req.user.role === 'worker'
        ? await Worker.findOne({ userId: req.user._id }).populate('assignedZoneId', 'name code')
        : null;
    return sendSuccess(res, { data: { user: req.user, workerProfile } });
  })
);

export default router;
