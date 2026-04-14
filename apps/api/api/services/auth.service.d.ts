import { UserRole } from '@saudi-re/shared';
export interface TokenPayload {
    userId: string;
    role: UserRole;
}
export declare class AuthService {
    /**
     * Hash a plain text password
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Compare a plain text password with a hash
     */
    static comparePassword(password: string, hash: string): Promise<boolean>;
    /**
     * Generate Access and Refresh tokens
     */
    static generateTokens(payload: TokenPayload): {
        accessToken: string;
        refreshToken: string;
    };
    /**
     * Verify a token and return the payload
     */
    static verifyToken(token: string): TokenPayload;
}
//# sourceMappingURL=auth.service.d.ts.map