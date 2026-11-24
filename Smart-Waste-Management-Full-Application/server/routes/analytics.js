import express from 'express';
import { authenticate, authorize } from '../shared/middleware/auth.js';
import {
  getAnalyticsSummary,
  getFleetUtilization,
  getGeospatialHotspots,
  getWasteTrends,
  getWorkerWorkload,
  getZoneStats
} from '../shared/services/analyticsService.js';
import { asyncHandler, sendSuccess } from '../shared/utils/response.js';

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/summary', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getAnalyticsSummary() })));
router.get('/trends', asyncHandler(async (req, res) => sendSuccess(res, { data: await getWasteTrends(Number(req.query.days || 14)) })));
router.get('/zones', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getZoneStats() })));
router.get('/fleet', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getFleetUtilization() })));
router.get('/workers', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getWorkerWorkload() })));
router.get('/hotspots', asyncHandler(async (_req, res) => sendSuccess(res, { data: await getGeospatialHotspots() })));

export default router;
