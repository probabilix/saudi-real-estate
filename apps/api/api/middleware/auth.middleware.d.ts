import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenPayload } from '../services/auth.service';
import { UserRole } from '@saudi-re/shared';
declare module 'fastify' {
    interface FastifyRequest {
        user?: TokenPayload;
    }
}
/**
 * Middleware: Verify JWT and attach user to request
 */
export declare const authenticateJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
/**
 * Middleware Factory: RBAC check
 */
export declare const requireRole: (roles: UserRole | UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
//# sourceMappingURL=auth.middleware.d.ts.map