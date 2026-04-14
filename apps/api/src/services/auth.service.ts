import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@saudi-re/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
const ACCESS_TOKEN_EXPIRY = '2h';
const REFRESH_TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Hash a plain text password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare a plain text password with a hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate Access and Refresh tokens
   */
  static generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    
    return { accessToken, refreshToken };
  }

  /**
   * Verify a token and return the payload
   */
  static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }
}
