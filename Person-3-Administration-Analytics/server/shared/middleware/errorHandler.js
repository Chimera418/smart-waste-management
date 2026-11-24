import { AppError } from '../utils/response.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || `req_${Date.now()}`;
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details || [], requestId }
    });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'MONGOOSE_VALIDATION', message: err.message, requestId }
    });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: `Invalid ${err.path}`, requestId }
    });
  }
  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_KEY', message: 'Duplicate record key', requestId }
    });
  }
  console.error('[API Error]', requestId, err?.message || err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error', requestId }
  });
}
