export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function sendSuccess(res, { statusCode = 200, message, data = null, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function generateCode(prefix) {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}-${rand}`;
}
