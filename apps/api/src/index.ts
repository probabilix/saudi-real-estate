// ──────────────────────────────────────────────
// Saudi Real Estate — Fastify API Entry Point
// ──────────────────────────────────────────────
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import oauth2 from '@fastify/oauth2';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import v1Routes from './routes/v1';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';

const app = Fastify({ 
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

// Validation & Serialization Logic
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// ── Security Middlewares ──
const start = async () => {
  try {
    // 0. Cookie Support (Crucial for Auth)
    await app.register(cookie, {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      parseOptions: {},
    });

    // 0.1 Google OAuth Registration
    await app.register(oauth2, {
      name: 'googleOAuth2',
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID || 'place-client-id-here',
          secret: process.env.GOOGLE_CLIENT_SECRET || 'place-client-secret-here',
        },
        auth: oauth2.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: '/api/v1/auth/google',
      callbackUri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/auth/google/callback`,
    });

    // 1. Helmet: Secure HTTP headers
    await app.register(helmet, {
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    });

    // 2. CORS: Cross-Origin Resource Sharing
    await app.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });

    // 3. Rate Limit: Prevent abuse
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // ── Register v1 API ──
    await app.register(v1Routes, { prefix: '/api/v1' });

    // ── Global Error Handler ──
    app.setErrorHandler((error: any, request, reply) => {
      if (error.validation) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error.validation,
        });
      }

      // Handle Zod errors specifically
      if (error instanceof ZodError || error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: 'Invalid input provided',
          details: error.errors || error.issues,
        });
      }

      // Default error handler
      const statusCode = error.statusCode || 500;
      app.log.error(error);
      
      return reply.status(statusCode).send({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : error.name,
        message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
      });
    });

    // ── Server Startup ──
    const port = parseInt(process.env.PORT || '3001', 10);
    
    // Only listen if not in a serverless environment
    if (process.env.NODE_ENV !== 'production') {
      await app.listen({ port, host: '0.0.0.0' });
      app.log.info(`🚀 Saudi Real Estate API running on http://localhost:${port}`);
    }
    
  } catch (err) {
    app.log.error(err);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Export the start function for manual control
export { start };

// Automatically run start() in local development
if (process.env.NODE_ENV !== 'production') {
  start();
}

// Default export for Vercel
export default async (req: any, res: any) => {
  await start(); // Ensure plugins and routes are registered
  await app.ready();
  app.server.emit('request', req, res);
};
