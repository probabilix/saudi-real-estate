// ──────────────────────────────────────────────
// Saudi Real Estate — Fastify API Entry Point
// Triggering restart for schema synchronization
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
import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import { systemSettings } from './db/schema';

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
    // Schema self-healing: Ensure listings table column exists before API requests hit the routes
    try {
      await db.execute(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_qualification_active BOOLEAN DEFAULT true;`);
      // Add personal profile columns to users table (available for ALL roles, not just brokers)
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);`);
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);`);
      app.log.info('Database schema self-healing verified: listings.ai_qualification_active is initialized.');
      
      // Self-heal chat messaging structures
      await db.execute(sql`DO $$ BEGIN CREATE TYPE sender_type AS ENUM ('USER', 'ASSISTANT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
      await db.execute(sql`DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('GENERAL', 'LISTING'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
      await db.execute(sql`ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS last_ai_summary TEXT;`);
      await db.execute(sql`ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMP WITH TIME ZONE;`);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          buyer_profile_id UUID NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
          sender sender_type NOT NULL,
          content TEXT NOT NULL,
          chat_type chat_type DEFAULT 'LISTING' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS chat_type chat_type DEFAULT 'LISTING' NOT NULL;`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS chat_msg_buyer_profile_idx ON chat_messages(buyer_profile_id);`);
      app.log.info('Database schema self-healing verified: Persistent chat messages table, buyer profile summary columns, and chat_type fields initialized.');

      // Self-heal project favorites table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS project_favorites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS user_project_idx ON project_favorites (user_id, project_id);`);
      app.log.info('Database schema self-healing verified: project_favorites table and index initialized.');

      // Self-heal buyer profiles auto-creation trigger on users table insert
      await db.execute(sql`
        CREATE OR REPLACE FUNCTION sync_user_to_buyer_profile()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = NEW.id) THEN
            INSERT INTO buyer_profiles (session_id, user_id, intent_score, contact_provided, language_preference, last_seen)
            VALUES (NEW.id::varchar, NEW.id, 0, false, 'en', CURRENT_TIMESTAMP);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await db.execute(sql`DROP TRIGGER IF EXISTS trigger_sync_user_to_buyer_profile ON users;`);
      await db.execute(sql`
        CREATE TRIGGER trigger_sync_user_to_buyer_profile
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION sync_user_to_buyer_profile();
      `);

      // Backfill any existing users that do not currently have a buyer profile record
      await db.execute(sql`
        INSERT INTO buyer_profiles (session_id, user_id, intent_score, contact_provided, language_preference, last_seen)
        SELECT id::varchar, id, 0, false, 'en', CURRENT_TIMESTAMP
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM buyer_profiles bp WHERE bp.user_id = u.id
        );
      `);

      // Clean up any existing auto-sync session IDs in the database
      await db.execute(sql`
        UPDATE buyer_profiles
        SET session_id = COALESCE(user_id::varchar, id::varchar)
        WHERE session_id = 'auto-sync';
      `);

      app.log.info('Database schema self-healing verified: sync_user_to_buyer_profile trigger, user backfill, and auto-sync session cleanup executed.');
    } catch (schemaErr) {
      app.log.error(schemaErr, 'Failed to verify database schemas on startup');
    }

    // 0. Cookie Support
    await app.register(cookie, {
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      parseOptions: {},
    });

    // 0.1 Dynamic Google OAuth Registration from Database settings
    let googleClientId = process.env.GOOGLE_CLIENT_ID || 'place-client-id-here';
    let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || 'place-client-secret-here';
    
    try {
      const dbClientId = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, 'google_client_id')
      });
      const dbClientSecret = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, 'google_client_secret')
      });
      
      if (dbClientId?.value) googleClientId = dbClientId.value;
      if (dbClientSecret?.value) googleClientSecret = dbClientSecret.value;
    } catch (dbErr: any) {
      app.log.warn(`[OAUTH SETUP] Google OAuth keys could not be queried from DB, using env: ${dbErr.message}`);
    }

    await app.register(oauth2, {
      name: 'googleOAuth2',
      scope: ['profile', 'email'],
      checkStateFunction: () => true, // Type-safe way to bypass state validation on localhost
      generateStateFunction: () => 'fixed-state', // Required alongside checkStateFunction
      credentials: {
        client: {
          id: googleClientId,
          secret: googleClientSecret,
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
      allowList: (request) => {
        const secretHeader = request.headers['x-webhook-secret'];
        return !!secretHeader && (
          secretHeader === process.env.N8N_WEBHOOK_SECRET || 
          secretHeader === 'saudi_re_n8n_secure_webhook_secret_2026'
        );
      }
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
