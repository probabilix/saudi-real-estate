import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, TokenPayload } from '../services/auth.service';
import { UserRole } from '@saudi-re/shared';

// Extend FastifyRequest for TS safety
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

/**
 * Middleware: Verify JWT and attach user to request
 */
export const authenticateJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, message: 'Unauthorised: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);
    request.user = payload;
  } catch (err) {
    return reply.code(401).send({ success: false, message: 'Unauthorised: Invalid or expired token' });
  }
};

/**
 * Middleware: Verify JWT and attach user to request (Optional)
 */
export const optionalAuthenticateJWT = async (request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = AuthService.verifyToken(token);
      request.user = payload;
    }
  } catch (err) {
    // Silent fail for optional auth
  }
};

/**
 * Middleware Factory: RBAC check
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ success: false, message: 'Unauthorised: Missing identity' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(request.user.role)) {
      reply.log.warn(`RBAC rejection: User ${request.user.userId} (${request.user.role}) attempted to access ${request.url}`);
      return reply.code(403).send({ success: false, message: 'Forbidden: Insufficient permissions' });
    }
  };
};
