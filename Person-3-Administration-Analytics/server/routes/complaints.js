import express from 'express';
import { Complaint } from '../shared/models/Complaint.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email')
      .populate('zoneId', 'name code')
      .sort({ createdAt: -1 })
      .limit(150);
    return sendSuccess(res, { data: complaints });
  })
);

export default router;
