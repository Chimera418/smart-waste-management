import express from 'express';
import { Complaint } from '../shared/models/Complaint.js';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize('admin', 'worker', 'vehicle_operator'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const complaints = await Complaint.find(filter)
      .populate('zoneId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);
    return sendSuccess(res, { data: complaints });
  })
);

export default router;
