import express from 'express';
import { User } from '../shared/models/User.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
    return sendSuccess(res, { data: users });
  })
);

export default router;
