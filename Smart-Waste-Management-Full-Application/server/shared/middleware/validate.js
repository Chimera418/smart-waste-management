import { AppError } from '../utils/response.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', details));
    }
    req.body = parsed.data;
    return next();
  };
}

export function createRateLimiter({ windowMs = 60000, max = 240 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || 'local';
    const now = Date.now();
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count += 1;
    hits.set(key, record);
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please retry shortly.' }
      });
    }
    return next();
  };
}
