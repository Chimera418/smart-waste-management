import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { recordAudit } from '../services/auditService.js';
import { AppError, asyncHandler } from '../utils/response.js';

export function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-swm-jwt-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    secret,
    { expiresIn }
  );
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required');
  }
  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET || 'dev-swm-jwt-secret-change-in-production';
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'User account is missing or deactivated');
  }
  req.user = user;
  next();
});

export function authorize(...allowedRoles) {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      await recordAudit({
        actor: req.user,
        action: 'RBAC_DENIED',
        resourceType: 'endpoint',
        resourceId: req.originalUrl,
        status: 'denied',
        req,
        metadata: { requiredRoles: allowedRoles, actualRole: req.user.role }
      });
      return next(
        new AppError(403, 'FORBIDDEN', `Role '${req.user.role}' cannot access this resource`)
      );
    }
    return next();
  };
}
