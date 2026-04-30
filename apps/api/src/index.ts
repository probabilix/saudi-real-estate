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

const isProduction = process.env.NODE_ENV === 'production';

// Initialize Fastify Instance
const app = Fastify({ 
  logger: {
    level: isProduction ? 'info' : 'debug',
    // Disable pino-pretty in production to avoid worker thread issues on Vercel
    transport: isProduction ? undefined : {
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

// Flag to ensure initialization only happens once
let initialized = false;

const bootstrap = async () => {
  if (initialized) return;

  try {
    // 0. Cookie Support
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

    // 1. Helmet
    await app.register(helmet, {
      contentSecurityPolicy: isProduction,
    });

    // 2. CORS
    await app.register(cors, {
      origin: (origin, cb) => {
        const allowed = (process.env.CORS_ORIGIN || '').split(',');
        if (!origin || allowed.includes(origin) || !isProduction) {
          cb(null, true);
          return;
        }
        cb(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder'],
    });

    // 3. Rate Limit
    await app.register(rateLimit, {
      max: isProduction ? 100 : 1000,
      timeWindow: '1 minute',
    });

    // ── Root Route (Health Check) ──
    app.get('/', async () => {
      return { 
        status: 'online', 
        message: 'Saudi Real Estate API is running',
        environment: process.env.NODE_ENV 
      };
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

      if (error instanceof ZodError || error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: 'Invalid input provided',
          details: error.errors || error.issues,
        });
      }

      const statusCode = error.statusCode || 500;
      app.log.error(error);
      
      return reply.status(statusCode).send({
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : error.name,
        message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
      });
    });

    initialized = true;
  } catch (err) {
    app.log.error(err);
    if (!isProduction) {
      process.exit(1);
    }
    throw err;
  }
};

// Automatically run bootstrap and listen in local development
if (!isProduction) {
  const start = async () => {
    await bootstrap();
    const port = parseInt(process.env.PORT || '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`🚀 Saudi Real Estate API running locally on http://localhost:${port}`);
  };
  start();
}

// Default export for Vercel
export default async (req: any, res: any) => {
  await bootstrap();
  await app.ready();
  app.server.emit('request', req, res);
};
