import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../shared/models/User.js';
import { USER_ROLES } from '../shared/config/constants.js';
import { authenticate, signToken } from '../shared/middleware/auth.js';
import { validateBody } from '../shared/middleware/validate.js';
import { recordAudit } from '../shared/services/auditService.js';
import { AppError, asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).max(100),
  role: z.enum(USER_ROLES).optional().default('admin')
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
    if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email already exists');

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: req.body.role
    });
    await recordAudit({
      actor: user,
      action: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: user._id,
      req
    });

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    return sendSuccess(res, { statusCode: 201, data: { token, user: safeUser } });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !user.isActive) {
      await recordAudit({
        action: 'LOGIN_FAILED',
        resourceType: 'auth',
        status: 'failure',
        req,
        metadata: { email: req.body.email }
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) {
      await recordAudit({
        actor: user,
        action: 'LOGIN_FAILED',
        resourceType: 'auth',
        status: 'failure',
        req
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();
    await recordAudit({ actor: user, action: 'LOGIN_SUCCESS', resourceType: 'auth', req });

    const token = signToken(user);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    return sendSuccess(res, { data: { token, user: safeUser } });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    return sendSuccess(res, { data: { user: req.user } });
  })
);

export default router;
