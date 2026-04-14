# SECURITY.md — Saudi Real Estate Platform
# Feed this file to every AI coding assistant at the start of every session.
# These are non-negotiable security constraints. Do not deviate from them.

---

## 1. WHO YOU ARE (AI ASSISTANT CONTEXT)

You are a senior full-stack TypeScript developer working on a two-sided AI-powered real estate marketplace for Saudi Arabia. The platform has 5 user roles: ADMIN, FIRM, AGENT, SOLO_BROKER, OWNER, and a public BUYER role.

Before writing any code, read this file in full. Every rule here exists because we have already made a deliberate security decision. Do not re-open these decisions. Do not suggest alternatives unless explicitly asked.

---

## 2. ABSOLUTE RED LINES — NEVER DO THESE

### Secrets & Environment Variables
- NEVER hardcode any secret, key, token, or credential in source code
- NEVER add a backend secret (OpenAI key, Twilio key, DATABASE_URL, JWT_SECRET, Cloudinary secret, n8n webhook secret) with the NEXT_PUBLIC_ prefix
- NEVER commit a .env file — it is in .gitignore
- NEVER use process.env directly in frontend components — create a validated config object in apps/api/src/config.ts and apps/web/src/config.ts that throws at startup if required vars are missing
- The ONLY env vars that may appear in the frontend (NEXT_PUBLIC_*) are:
  - NEXT_PUBLIC_API_URL (backend URL)
  - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (not the secret)
  - NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (for signed uploads only)
  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (restricted to domain in Google Console)

### Database Queries
- NEVER write raw SQL string concatenation: db.execute(`SELECT * FROM listings WHERE city = '${userInput}'`) — THIS IS SQL INJECTION
- ALWAYS use Drizzle ORM parameterised queries: db.select().from(listings).where(eq(listings.city, userInput))
- NEVER use SELECT * — always specify columns explicitly to prevent over-fetching sensitive fields
- NEVER return password_hash, refresh_token_hash, or mandate_doc_url in public API responses
- ALWAYS soft delete (set deleted_at = NOW()) — never use hard DELETE on listings, users, or leads

### Authentication
- NEVER store passwords in plain text — ALWAYS bcrypt with cost factor 12
- NEVER return password_hash in any API response, ever, under any circumstances
- NEVER store the raw refresh token in the database — store sha256(refreshToken) only
- NEVER put the access token in localStorage or a regular cookie — memory-only on the client, or httpOnly cookie for refresh token
- NEVER trust role from the client request body or query params — ALWAYS read role from the verified JWT payload
- NEVER skip the is_active check — a deactivated user must be rejected even with a valid JWT

### Authorization
- NEVER write an endpoint that fetches, updates, or deletes a resource without checking that the calling user owns it
- The pattern is always: WHERE id = :resourceId AND owner_id = :userId (unless role = ADMIN)
- NEVER allow a BUYER to access broker routes
- NEVER allow an AGENT to see another agent's leads, even within the same firm
- NEVER allow a FIRM to see data from another firm

### Frontend Safety
- NEVER call the database directly from frontend code — ALL database access goes through the Fastify API
- NEVER use dangerouslySetInnerHTML with user-provided content
- ALWAYS sanitize Arabic text input with isomorphic-dompurify before storing

---

## 3. AUTHENTICATION SYSTEM (DO NOT MODIFY WITHOUT REVIEW)

The auth system is finalized. Do not regenerate it. Do not suggest replacing it with NextAuth, Clerk, Supabase Auth, or any third-party provider.

### What is already implemented:
- Passwords: bcrypt, cost factor 12, using the `bcrypt` npm package
- Access token: JWT, 15-minute expiry, stored in memory only on client (never localStorage)
- Refresh token: JWT, 30-day expiry, stored as httpOnly + Secure + SameSite=Strict cookie
- Refresh token rotation: every use invalidates the old token and issues a new one
- Refresh token storage: sha256(token) stored in users table
- JWT payload: { userId, role, firmId } — nothing else, no sensitive data
- Email verification: OTP sent via Resend on registration. Login blocked for unverified accounts after 24h.
- Password reset: token expires in 15 minutes, stored as sha256(token) in DB
- Logout: refresh token hash deleted from DB, cookie cleared

### Auth middleware chain (Fastify preHandlers, applied in this order):
1. `verifyAccessToken` — validates JWT signature and expiry
2. `requireActiveUser` — checks users.is_active = true (Redis-cached for 60s)
3. `requireRole(['FIRM', 'AGENT'])` — role whitelist check
4. Business logic handler

Do not add steps between 1 and 2. Do not skip step 2.

---

## 4. AUTHORIZATION RULES (ROLE MATRIX)

| Action | ADMIN | FIRM | AGENT | SOLO_BROKER | OWNER | BUYER |
|--------|-------|------|-------|-------------|-------|-------|
| See all users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| See own firm's agents/listings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create listing | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit any listing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit own listing | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| See own leads | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| See other broker's leads | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve listings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create agent sub-accounts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Browse listings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Use AI chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### IDOR Prevention — Required Pattern for Every Write Endpoint:
```typescript
// CORRECT — ownership check before any mutation
const listing = await db.select({ ownerId: listings.ownerId })
  .from(listings)
  .where(and(eq(listings.id, request.params.id), isNull(listings.deletedAt)))
  .limit(1);

if (!listing[0]) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND' } });
if (listing[0].ownerId !== request.user.userId && request.user.role !== 'ADMIN') {
  return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN' } });
}
// Only now proceed with the update
```

---

## 5. INPUT VALIDATION RULES

Every API route MUST have a Zod schema. The Zod schema runs in a Fastify preValidation hook before the handler. If validation fails, return 400 immediately — do not pass invalid input to the handler.

### Field-level rules:
- All text fields: `.trim()` in Zod schema
- Email fields: `.email().toLowerCase()`
- Price fields: `.int().positive().max(1_000_000_000)` — SAR, no decimals
- Latitude: `.min(16.0).max(32.0)` — Saudi Arabia bounds
- Longitude: `.min(36.0).max(56.0)` — Saudi Arabia bounds
- UUIDs: `z.string().uuid()` — never accept freeform ID strings
- Cloudinary URLs in photos array: `.url().startsWith('https://res.cloudinary.com/')` — reject URLs from other domains
- Amenities JSONB: use `.strict()` in Zod — reject unknown keys
- Arabic text: sanitize with `isomorphic-dompurify` after Zod validation before DB insert
- File uploads (signed URL generation): validate MIME type server-side. Allowed: `['image/jpeg', 'image/png', 'image/webp', 'application/pdf']` for mandate docs only

### SQL injection is prevented structurally:
Drizzle ORM uses parameterised queries. Raw SQL via `db.execute()` is BANNED. If you see `db.execute()` with string interpolation in a code review, reject it.

---

## 6. RATE LIMITING (ALREADY CONFIGURED — DO NOT CHANGE WITHOUT DISCUSSION)

Using @upstash/ratelimit with sliding window algorithm. All limits are per-IP unless noted.

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| POST /auth/login | 5 requests | 1 minute | Brute force protection |
| POST /auth/register | 3 requests | 10 minutes | Account farming prevention |
| POST /auth/forgot-password | 3 requests | 15 minutes | Inbox spam + email enumeration |
| POST /chat/message | 10 requests | 1 minute | AI cost control |
| POST /chat/message (per session) | 50 messages | Lifetime | Per session total cap |
| GET /listings | 100 requests | 1 minute | Normal browsing |
| POST /uploads/signed-url | 20 requests | 1 minute | Per user (not IP) |
| POST /buyers/enquire/:id | 1 request | 24 hours | Per session+listingId AND per IP |
| GET+POST /admin/* | 30 requests | 1 minute | Per user |

### Response on rate limit exceeded: HTTP 429
```json
{ "success": false, "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Please try again later." } }
```

---

## 7. ENVIRONMENT VARIABLES REFERENCE

### Backend (Railway) — ALL SECRET — never NEXT_PUBLIC_
```
DATABASE_URL=           # Neon PgBouncer pooler URL (not direct URL)
DATABASE_URL_DIRECT=    # Neon direct URL (migrations only)
JWT_ACCESS_SECRET=      # Min 64 chars random string
JWT_REFRESH_SECRET=     # Min 64 chars random string, DIFFERENT from access secret
BCRYPT_ROUNDS=12
OPENAI_API_KEY=         # sk-... — NEVER expose to frontend
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
RESEND_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=  # NEVER expose to frontend
N8N_BASE_URL=           # https://n8n.yourdomain.com
N8N_WEBHOOK_SECRET=     # Shared secret for n8n webhook authentication
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Frontend (Vercel) — ONLY these may be NEXT_PUBLIC_
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=  # Signed preset only
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=       # Restricted to domain in Google Console
NEXT_PUBLIC_SENTRY_DSN=                # Frontend Sentry DSN (different from backend)
```

---

## 8. N8N WEBHOOK SECURITY

n8n is self-hosted at https://n8n.yourdomain.com and handles all AI workflows.

### Rules:
- All webhook calls from the Fastify API to n8n MUST include the header: `X-Webhook-Secret: <N8N_WEBHOOK_SECRET>`
- n8n workflows MUST validate this header on entry — reject any call without it with HTTP 403
- n8n is NOT exposed to the public internet for direct access — only callable from the Fastify backend
- n8n execution data retention: 7 days maximum (contains buyer PII)
- n8n credentials are encrypted at rest (enable in n8n settings: Credentials > Encryption Key)

---

## 9. DATA EXPOSURE RULES — WHAT IS NEVER RETURNED IN API RESPONSES

The following fields MUST be excluded from ALL API responses using a sanitization function. This is enforced via TypeScript types — the return type of user-fetching functions must exclude these fields.

**From users table — NEVER return:**
- `password_hash`
- `refresh_token_hash`

**From listings table — NEVER return to BUYER role:**
- `mandate_doc_url` (only visible to listing owner and ADMIN)
- `owner_id` raw UUID (return a nested `broker` object instead)
- `deleted_at`

**From leads table — NEVER return to non-owner:**
- Full buyer contact details (phone, email) before lead is in VIEWED status — broker must "open" the lead to unlock contact info

---

## 10. LOGGING & MONITORING RULES

### What MUST be logged (structured JSON to Sentry + Railway logs):
- Every login attempt: `{ event: 'AUTH_LOGIN', userId, ip, userAgent, success: true/false, timestamp }`
- Every failed authorization: `{ event: 'AUTH_FORBIDDEN', userId, route, timestamp }`
- Every password reset request: `{ event: 'PASSWORD_RESET_REQUESTED', email_hash: sha256(email), ip, timestamp }` — hash the email, never log it plain
- Every rate limit hit: `{ event: 'RATE_LIMITED', ip, endpoint, timestamp }`
- Every n8n workflow failure after all retries

### What MUST NEVER appear in logs:
- Raw passwords (even in error stack traces)
- JWT tokens or refresh tokens
- Full email addresses (use sha256 hash for correlation)
- Buyer phone numbers
- Payment references or card data

### Sentry configuration:
`beforeSend` hook scrubs these keys from all captured events: `password`, `password_hash`, `token`, `refreshToken`, `authorization`, `cookie`, `x-webhook-secret`

---

## 11. CORS POLICY

```typescript
// apps/api/src/app.ts
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') ?? [],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Required for httpOnly cookie to be sent
  maxAge: 86400,
});
```

In development, `http://localhost:3000` is added dynamically. In production, only the production domain is allowed. The Railway backend URL itself is NOT in the allowed origins — it is never called directly from a browser.

---

## 12. SECURITY AUDIT HISTORY

| Date | Area | Finding | Status |
|------|------|---------|--------|
| 2025 Q1 | Auth | Email verification not implemented | ✅ Fixed — OTP flow added |
| 2025 Q1 | Auth | Password reset tokens not expiring | ✅ Fixed — 15min expiry + sha256 storage |
| 2025 Q1 | IDOR | Listing PATCH missing ownership check | ✅ Fixed — assertListingOwner() helper |
| 2025 Q1 | Rate limiting | forgot-password not rate limited | ✅ Fixed |
| 2025 Q1 | Secrets | n8n webhooks had no authentication | ✅ Fixed — X-Webhook-Secret header |
| 2025 Q1 | Logging | Sentry capturing raw passwords in errors | ✅ Fixed — beforeSend scrubbing |

---

## 13. SECURITY CHECKLIST FOR NEW ENDPOINTS

Before shipping any new API endpoint, verify:

- [ ] Zod schema validates all inputs (body, params, query)
- [ ] Route has correct role preHandler middleware
- [ ] Private data queries include `WHERE owner_id = :userId` or equivalent ownership check
- [ ] Response does not include password_hash, refresh_token_hash, or other forbidden fields
- [ ] Rate limiting is applied if endpoint is callable without authentication
- [ ] Errors return structured JSON with appropriate HTTP status code (400/401/403/404/429/500)
- [ ] No raw SQL string concatenation
- [ ] Side effects (emails, notifications, cache invalidation) are in BullMQ jobs, not inline
- [ ] Sentry captures errors but scrubs sensitive fields
- [ ] New env vars are added to this file's env reference section
