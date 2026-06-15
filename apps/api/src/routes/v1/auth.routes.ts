import { FastifyInstance } from 'fastify';
import { AuthService } from '../../services/auth.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { EmailService } from '../../services/email.service';
import { registerSchema, loginSchema } from '@saudi-re/shared';
import { users } from '../../db/schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export default async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Multi-role registration (Buyer, Broker, Firm, Agent)
   */
  app.post('/register', async (request, reply) => {
    let rawBody;
    try {
      rawBody = registerSchema.parse(request.body);
    } catch (e: any) {
      return reply.code(400).send({ success: false, message: 'Invalid input', errors: e.errors });
    }
    const { email: rawEmail, password, name, role, phone, regaLicence } = rawBody as any;
    const email = rawEmail.toLowerCase().trim();

    try {
      // 1. Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return reply.code(400).send({ success: false, message: 'User with this email already exists' });
      }

      // 2. Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // 3. Create User record
      // Brokers/Firms/Agents start as isActive: false until manual verification
      const isAwaitingVerification = ['SOLO_BROKER', 'FIRM', 'AGENT'].includes(role);
      
      const newUsers = await db.insert(users).values({
        email,
        passwordHash,
        name,
        role,
        phone,
        regaLicence,
        isActive: !isAwaitingVerification, // Active for Buyers/Owners, Inactive for Brokers (until approval)
        regaVerified: false,
      }).returning();

      const newUser = newUsers[0];

      // 4. Trigger Emails
      await EmailService.sendWelcomeEmail(email, name, role);
      
      if (isAwaitingVerification) {
        await EmailService.sendAdminVerificationAlert({
          id: newUser.id,
          name: newUser.name as string,
          role: newUser.role,
          email: newUser.email,
          regaLicence: newUser.regaLicence as string,
        });
      }
      
      // 5. Issue Tokens if active (Buyers/Owners)
      let tokens = null;
      if (!isAwaitingVerification) {
        tokens = AuthService.generateTokens({
          userId: newUser.id,
          role: newUser.role,
        });

        // Store refresh token in HTTP-only cookie
        reply.setCookie('refreshToken', tokens.refreshToken, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      }

      return reply.code(201).send({ 
        success: true, 
        message: isAwaitingVerification ? 'Registration successful. Awaiting admin verification.' : 'Registration successful.',
        data: { 
          userId: newUser.id,
          accessToken: tokens?.accessToken,
          user: tokens ? { 
            id: newUser.id, 
            name: newUser.name, 
            role: newUser.role, 
            email: newUser.email,
            avatarUrl: newUser.avatarUrl,
            creditsBalance: newUser.creditsBalance,
            phone: newUser.phone,
            verificationStatus: newUser.verificationStatus,
            isReapplied: newUser.isReapplied
          } : undefined
        } 
      });

    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Credential-based authentication
   */
  app.post('/login', async (request, reply) => {
    let rawBody;
    try {
      rawBody = loginSchema.parse(request.body);
    } catch (e: any) {
      return reply.code(400).send({ success: false, message: 'Invalid input', errors: e.errors });
    }
    const { email: rawEmail, password } = rawBody as any;
    const email = rawEmail.toLowerCase().trim();

    try {
      // 1. Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return reply.code(401).send({ success: false, message: 'Invalid credentials' });
      }

      // 2. Check if active (Verification gate)
      if (!user.isActive) {
        return reply.code(403).send({ 
          success: false, 
          message: 'Account is awaiting manual verification from REGA/Admin.' 
        });
      }

      // 3. Verify password
      const isValid = await AuthService.comparePassword(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ success: false, message: 'Invalid credentials' });
      }

      // 4. Issue Tokens
      const { accessToken, refreshToken } = AuthService.generateTokens({
        userId: user.id,
        role: user.role,
      });

      // 5. Store refresh token in HTTP-only cookie
      reply.setCookie('refreshToken', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return reply.send({ 
        success: true, 
        data: { 
          accessToken, 
          user: { 
            id: user.id, 
            name: user.name, 
            role: user.role, 
            email: user.email,
            avatarUrl: user.avatarUrl,
            creditsBalance: user.creditsBalance,
            phone: user.phone,
            verificationStatus: user.verificationStatus,
            isReapplied: user.isReapplied
          } 
        } 
      });

    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * GET /api/v1/auth/google/callback
   * Google OAuth Callback handler
   */
  app.get('/google/callback', async (request, reply) => {
    app.log.info('[GOOGLE OAUTH CALLBACK] Callback request received. Query params: %j', request.query as any);
    try {
      app.log.info('[GOOGLE OAUTH CALLBACK] Step 1: Exchanging authorization code for tokens...');
      const { token } = await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      app.log.info('[GOOGLE OAUTH CALLBACK] Tokens exchanged successfully. Token details: has_access_token=%s, token_type=%s', !!token.access_token, token.token_type);
      
      // 1. Fetch Google User Profile details from standard oauth endpoint
      app.log.info('[GOOGLE OAUTH CALLBACK] Step 2: Fetching userinfo from Google API...');
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token.access_token}`
        }
      });
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        app.log.error('[GOOGLE OAUTH CALLBACK] Google API response was not OK: %s %s. Body: %s', profileResponse.status, profileResponse.statusText, errorText);
        throw new Error(`Failed to fetch Google profile: ${profileResponse.statusText}`);
      }
      
      const googleProfile = await profileResponse.json() as {
        email: string;
        name: string;
        picture?: string;
      };
      app.log.info('[GOOGLE OAUTH CALLBACK] Google profile retrieved successfully for: %s', googleProfile.email);
      
      const googleUserEmail = googleProfile.email.toLowerCase().trim();
      const googleUserName = googleProfile.name || 'Google User';
      const googlePicture = googleProfile.picture || null;
      
      // 2. Find or create user
      app.log.info('[GOOGLE OAUTH CALLBACK] Step 3: Searching for user record in DB: %s', googleUserEmail);
      let user = await db.query.users.findFirst({
        where: eq(users.email, googleUserEmail),
      });

      if (!user) {
        app.log.info('[GOOGLE OAUTH CALLBACK] User does not exist, inserting user record...');
        const newUsers = await db.insert(users).values({
          email: googleUserEmail,
          name: googleUserName,
          role: 'BUYER',
          passwordHash: 'OAUTH_USER',
          avatarUrl: googlePicture,
          isActive: true,
          regaVerified: false,
        }).returning();
        user = newUsers[0];
        app.log.info('[GOOGLE OAUTH CALLBACK] User record inserted successfully, ID: %s', user.id);
        
        try {
          app.log.info('[GOOGLE OAUTH CALLBACK] Sending welcome email...');
          await EmailService.sendWelcomeEmail(user.email, user.name as string, user.role);
          app.log.info('[GOOGLE OAUTH CALLBACK] Welcome email sent.');
        } catch (emailErr) {
          app.log.error(emailErr, '[GOOGLE OAUTH CALLBACK] Welcome email failed to send (non-blocking)');
        }
      } else {
        app.log.info('[GOOGLE OAUTH CALLBACK] User already exists, ID: %s', user.id);
        // Synchronize avatar picture if it changed or was empty
        if (googlePicture && user.avatarUrl !== googlePicture) {
          app.log.info('[GOOGLE OAUTH CALLBACK] Synchronizing avatarUrl...');
          await db.update(users)
            .set({ avatarUrl: googlePicture, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          user.avatarUrl = googlePicture;
          app.log.info('[GOOGLE OAUTH CALLBACK] AvatarUrl synchronized successfully.');
        }
      }

      // 3. Issue Tokens
      app.log.info('[GOOGLE OAUTH CALLBACK] Step 4: Generating application tokens...');
      const { accessToken, refreshToken } = AuthService.generateTokens({
        userId: user.id,
        role: user.role,
      });

      // 4. Cookies & Redirect
      app.log.info('[GOOGLE OAUTH CALLBACK] Step 5: Setting session cookies & redirecting...');
      reply.setCookie('refreshToken', refreshToken, {
        path: '/', 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        maxAge: 30 * 24 * 60 * 60
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      app.log.info('[GOOGLE OAUTH CALLBACK] Redirecting back to frontend home page...');
      return reply.redirect(`${frontendUrl}/en?token=${accessToken}`);

    } catch (err: any) {
      app.log.error(err, '[GOOGLE OAUTH CALLBACK] OAuth Callback execution crashed!');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/en?error=OAuthFailed`);
    }
  });

  /**
   * GET /api/v1/auth/me
   * Profile retrieval
   */
  app.get('/me', { preHandler: [authenticateJWT] }, async (request, reply) => {
    const userId = request.user?.userId;

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId as string),
      });

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      return reply.send({ 
        success: true, 
        data: { 
          user: { 
            id: user.id, 
            name: user.name, 
            role: user.role, 
            email: user.email, 
            avatarUrl: user.avatarUrl,
            regaVerified: user.regaVerified,
            creditsBalance: user.creditsBalance,
            phone: user.phone,
            gender: user.gender,
            nationality: user.nationality,
            city: user.city,
            verificationStatus: user.verificationStatus,
            isReapplied: user.isReapplied
          } 
        } 
      });

    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Issue new access token using refresh token from cookie
   */
  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      return reply.code(401).send({ success: false, message: 'Refresh token missing' });
    }

    try {
      const payload = AuthService.verifyToken(refreshToken);
      
      // Issue ONLY new access token
      const accessToken = AuthService.generateAccessToken({ 
        userId: payload.userId, 
        role: payload.role 
      });

      return reply.send({ 
        success: true, 
        data: { accessToken } 
      });
    } catch (err) {
      return reply.code(401).send({ success: false, message: 'Invalid or expired refresh token' });
    }
  });

  /**
   * POST /api/v1/auth/forgot-password
   */
  app.post('/forgot-password', async (request, reply) => {
    const { email: rawEmail } = request.body as { email: string };
    if (!rawEmail) {
      return reply.code(400).send({ success: false, message: 'Email is required' });
    }
    const email = rawEmail.toLowerCase().trim();
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      // Standard security: return success even if email not found to prevent user enumeration
      if (!user) {
        return reply.send({ 
          success: true, 
          message: 'If the email exists in our system, a recovery code has been sent.' 
        });
      }

      // Generate secure 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Sign dynamic JWT reset token (JWT_SECRET + user.passwordHash)
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
      const sessionToken = jwt.sign(
        { userId: user.id, otp },
        JWT_SECRET + user.passwordHash,
        { expiresIn: '10m' } // 10 minutes expiry
      );

      // Trigger Resend dynamic email dispatcher
      await EmailService.sendPasswordResetOTP(user.email, user.name || 'User', otp);

      return reply.send({
        success: true,
        message: 'If the email exists in our system, a recovery code has been sent.',
        data: { token: sessionToken }
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/v1/auth/reset-password
   */
  app.post('/reset-password', async (request, reply) => {
    const { token, code, newPassword } = request.body as { token: string; code: string; newPassword?: string };
    if (!token || !code || !newPassword) {
      return reply.code(400).send({ success: false, message: 'Token, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return reply.code(400).send({ success: false, message: 'Password must be at least 6 characters long' });
    }

    try {
      // 1. Decode token without verifying first to find user ID
      const decoded = jwt.decode(token) as { userId: string; otp: string } | null;
      if (!decoded || !decoded.userId) {
        return reply.code(400).send({ success: false, message: 'Invalid or corrupted reset session' });
      }

      // 2. Load user to fetch their actual dynamic signature
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });

      if (!user) {
        return reply.code(400).send({ success: false, message: 'Invalid or expired session' });
      }

      // 3. Cryptographically verify signature (JWT_SECRET + user.passwordHash)
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-prod';
      let payload: { userId: string; otp: string };
      try {
        payload = jwt.verify(token, JWT_SECRET + user.passwordHash) as { userId: string; otp: string };
      } catch (err) {
        return reply.code(400).send({ success: false, message: 'Reset session has expired or is invalid' });
      }

      // 4. Validate OTP match
      if (payload.otp !== code.trim()) {
        return reply.code(400).send({ success: false, message: 'Invalid 6-digit recovery code' });
      }

      // 5. Update user password (automatically invalidates token on completion!)
      const passwordHash = await AuthService.hashPassword(newPassword);
      await db.update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return reply.send({ success: true, message: 'Password has been successfully reset' });
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ success: false, message: 'Internal Server Error' });
    }
  });

  /**
   * POST /api/v1/auth/logout
   */
  app.post('/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.send({ success: true, message: 'Logged out successfully' });
  });
}
