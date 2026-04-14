# ARCHITECTURE.md — Saudi Real Estate Platform
# Feed this file to AI coding assistants at the start of every session.
# This is the single source of truth for all architectural decisions.
# Last updated: 2025 | Version 1.0 | Internal & Confidential

---

## WHAT WE ARE BUILDING

A two-sided AI-powered real estate marketplace for Saudi Arabia. Brokers get context-rich qualified leads. Buyers get a personalised, AI-guided property experience. Core differentiator: AI qualification and matching layer before any broker interaction.

**Problems we solve:**
- Existing portals (Bayut, PropertyFinder) give brokers raw phone numbers — 150 junk leads, 1 close
- International/expat buyers cannot navigate Arabic-first portals
- No platform qualifies buyer intent before routing leads

---

## 🌐 GLOBAL EXPANSION & EXPAT STRATEGY

The platform is engineered for a diverse audience, including Saudi locals, foreign investors, and expats.

**Architectural Pillars:**
- **Interactive Localization**: High-precision country code pickers with flags/logos for a "smooth" onboarding experience.
- **E.164 Data Standard**: All phone numbers are surgicially stored in the `+ [CountryCode] [Number]` format to ensure global SMS/WhatsApp reach.
- **Bilingual Core**: Every internal logic path (validation, errors, notifications) is designed to handle Arabic (RTL) and English (LTR) with equal performance.
- **Validation Resilience**: Professional error handling (400 Bad Request) replaces generic server crashes, providing clear feedback to international users.

---

## USER ROLES (5 ROLES — ALWAYS CHECK ROLE BEFORE DATA ACCESS)

| Role | Who | Key capability | Revenue |
|------|-----|----------------|---------|
| ADMIN | Founding team | Full access, override anything | Cost |
| FIRM | Registered company | Manages agents, sees all firm data | Master subscription |
| AGENT | Individual under firm | Lists under firm, receives own leads | Uses firm quota |
| SOLO_BROKER | Independent operator | All agent capabilities, self-managed | Own subscription |
| OWNER | Property owner (non-broker) | List own properties | Per-listing fee |
| BUYER | End user (free) | Browse, AI chat, shortlist, enquire | Free — they are the product |

**Role hierarchy:** ADMIN > FIRM > AGENT. A FIRM sees all its agents' data. An AGENT never sees other agents' data. BUYER is fully isolated.

**How role is enforced:** JWT payload includes `{ userId, role, firmId }`. Verified server-side on every request. Never trusted from client body.

---

## TECHNOLOGY STACK

### Frontend — apps/web
- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel (automatic HTTPS, global CDN)
- **Styling:** Tailwind CSS with tailwindcss-rtl for Arabic RTL support
- **State (server):** TanStack Query (React Query)
- **State (client):** Zustand — auth session, buyer profile, shortlist, UI state. No Redux.
- **i18n:** next-intl — Arabic (RTL) + English (LTR), locale routing /ar/ and /en/
- **Forms:** React Hook Form + Zod (same Zod schemas reused on backend)
- **Images:** next/image with Cloudinary URLs
- **Maps:** Google Maps JavaScript API

### Backend — apps/api
- **Framework:** Fastify (Node.js) — TypeScript, built-in AJV schema validation, plugin architecture
- **Hosting:** Railway ($5/month always-on)
- **Validation:** Zod on all routes — body, params, query all validated before handler runs
- **Auth:** Custom JWT — bcrypt passwords, 15min access token, 30-day httpOnly refresh cookie
- **Email:** Resend (transactional)
- **ORM:** Drizzle ORM — type-safe SQL, parameterised queries only, migration files in git

### Database
- **Primary:** PostgreSQL via Neon (serverless, managed cloud — not self-hosted)
- **Connection:** Always via PgBouncer pooler URL, never direct URL in production
- **Cache:** Upstash Redis — API response cache, rate limiting, session store, job queue
- **Why Neon over Supabase:** Neon has no browser client — the only access path is through the backend server. Correct security model.

### AI & Automation
- **AI model:** OpenAI GPT-4o — chat qualification, Arabic→English translation, lead summaries
- **Workflow engine:** n8n (self-hosted on KVM2 VPS, behind Nginx + SSL)
- **Job queue:** BullMQ backed by Upstash Redis
- **n8n workflows:** (1) AI chat qualification, (2) listing translation, (3) lead card + WhatsApp notification, (4) intent score recalculation, (5) inactivity listing flag, (6) weekly broker digest

### Media
- **Service:** Cloudinary — upload, transform, CDN delivery
- **Upload flow:** Browser → request signed URL from API → upload directly to Cloudinary → browser sends URL back to API → saved in DB. Server never handles binary files.
- **Transformations applied at URL construction:** f_auto, q_auto, w_1200h_800c_fill (full), w_400h_280c_fill (thumbnail)

### Infrastructure
- **CDN/WAF:** Cloudflare (free tier) — sits in front of Vercel, DDoS protection, forces HTTPS
- **Rate limiting:** @upstash/ratelimit in Fastify middleware, per-IP sliding window
- **Error monitoring:** Sentry (frontend + backend, separate DSNs)
- **Notifications:** Twilio WhatsApp Business API (primary) + Resend email (fallback)
- **Backups:** Neon PITR (7 days) + nightly pg_dump → S3 (AWS free tier)
- **CI/CD:** GitHub Actions → Railway (backend) + Vercel (frontend) on push to main

---

## DATABASE SCHEMA (CORE TABLES)

### users
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email VARCHAR(255) UNIQUE NOT NULL  -- lowercase, trimmed
phone VARCHAR(30)                   -- international format +966...
password_hash VARCHAR(255) NOT NULL -- bcrypt cost 12. NEVER returned in API responses.
role ENUM('ADMIN','FIRM','AGENT','SOLO_BROKER','OWNER','BUYER') NOT NULL
firm_id UUID FK → users.id NULLABLE -- AGENT role only
name VARCHAR(255)
rega_licence VARCHAR(100)           -- FIRM, AGENT, SOLO_BROKER
rega_verified BOOLEAN DEFAULT false
subscription_tier ENUM('FREE','STARTER','PRO','ELITE') DEFAULT 'FREE'
subscription_until TIMESTAMPTZ
avatar_url TEXT                     -- Cloudinary URL
is_active BOOLEAN DEFAULT true      -- soft disable
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### listings
```sql
id UUID PRIMARY KEY
owner_id UUID FK → users.id NOT NULL
type ENUM('APARTMENT','VILLA','OFFICE','RETAIL','LAND','COMPOUND')
purpose ENUM('SALE','RENT','LEASE')
status ENUM('ACTIVE','SOLD','RENTED','DRAFT','FLAGGED') DEFAULT 'DRAFT'
city VARCHAR(100) NOT NULL
district VARCHAR(100)
lat DECIMAL(10,7)   -- valid range: 16.0 to 32.0 (Saudi Arabia)
lng DECIMAL(10,7)   -- valid range: 36.0 to 56.0 (Saudi Arabia)
price BIGINT NOT NULL  -- SAR, no decimals
area_sqm DECIMAL(10,2)
bedrooms SMALLINT
bathrooms SMALLINT
ar_title VARCHAR(500)    -- Arabic, entered by lister
ar_description TEXT
en_title VARCHAR(500)    -- AI-generated English
en_description TEXT
translation_status ENUM('PENDING','DONE','FAILED') DEFAULT 'PENDING'
photos TEXT[] NOT NULL   -- Cloudinary URLs, minimum 3
amenities JSONB DEFAULT '{}'
foreigner_eligible BOOLEAN DEFAULT false
is_featured BOOLEAN DEFAULT false
featured_until TIMESTAMPTZ
verified BOOLEAN DEFAULT false
mandate_doc_url TEXT     -- NEVER returned to BUYER role
views_count INTEGER DEFAULT 0
search_vector TSVECTOR GENERATED  -- Arabic + English full-text
deleted_at TIMESTAMPTZ  -- soft delete only, never hard DELETE
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### buyer_profiles
```sql
id UUID PRIMARY KEY
session_id VARCHAR(255) NOT NULL  -- server-generated UUID, not client-provided
user_id UUID FK → users.id NULLABLE
budget_min BIGINT   -- SAR
budget_max BIGINT
city_preference VARCHAR(100)
property_type TEXT[]
purpose ENUM('OWN_USE','INVESTMENT','RENTAL_INCOME')
timeline_months SMALLINT
intent_score SMALLINT DEFAULT 0  -- 0-100, recalculated on every session update
listings_viewed UUID[]
shortlisted UUID[]
contact_provided BOOLEAN DEFAULT false
language_preference ENUM('ar','en','ur','hi') DEFAULT 'en'
last_seen TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

### leads
```sql
id UUID PRIMARY KEY
buyer_profile_id UUID FK → buyer_profiles.id NOT NULL
listing_id UUID FK → listings.id NOT NULL
broker_id UUID FK → users.id NOT NULL
status ENUM('NEW','VIEWED','CONTACTED','CLOSED_WON','CLOSED_LOST') DEFAULT 'NEW'
intent_score_at_creation SMALLINT
ai_summary TEXT
buyer_budget_display VARCHAR(100)
buyer_timeline_display VARCHAR(100)
notified_whatsapp BOOLEAN DEFAULT false
notified_email BOOLEAN DEFAULT false
notified_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

### subscriptions
```sql
id UUID PRIMARY KEY
user_id UUID FK → users.id NOT NULL
tier ENUM('STARTER','PRO','ELITE')
price_sar INTEGER NOT NULL  -- 299 / 799 / 1999
started_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
payment_reference VARCHAR(255)
is_active BOOLEAN DEFAULT true
```

---

## API ROUTES REFERENCE

### Auth — /api/v1/auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | None | Create account |
| POST | /login | None | Returns access token + sets httpOnly refresh cookie |
| POST | /refresh | Refresh cookie | Issues new access token |
| POST | /logout | Access token | Invalidates refresh token, clears cookie |
| POST | /verify-email | None | Verifies email OTP |
| POST | /forgot-password | None | Sends reset email (always 200, never reveals if email exists) |
| POST | /reset-password | Reset token | Validates token (15min expiry), sets new hash |

### Listings — /api/v1/listings
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | None | Search with filters. Returns public fields only. |
| GET | /:id | None | Listing detail. Increments views async via BullMQ. |
| GET | /featured | None | Active featured listings for homepage |
| POST | / | FIRM/AGENT/SOLO_BROKER/OWNER/ADMIN | Create listing |
| PATCH | /:id | Owner OR ADMIN | Update (must verify ownership) |
| DELETE | /:id | Owner OR ADMIN | Soft delete only |
| POST | /:id/photos | Owner | Save Cloudinary URLs. Min 3 enforced. |
| POST | /:id/verify | ADMIN only | Mark listing verified |
| POST | /:id/feature | ADMIN only | Set featured placement |

### Buyer — /api/v1/buyers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /profile | None (session) | Create/update buyer profile from AI chat |
| GET | /profile | None (session) | Get profile + personalised feed |
| POST | /shortlist/:listingId | Optional | Add to shortlist |
| DELETE | /shortlist/:listingId | Session or auth | Remove from shortlist |
| POST | /enquire/:listingId | Session or auth | Creates lead. Rate limited: 1/24h per session+listing AND 3/hour per IP |

### Broker — /api/v1/broker
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /dashboard | FIRM/AGENT/SOLO_BROKER | Aggregate stats |
| GET | /leads | FIRM/AGENT/SOLO_BROKER | Lead inbox. FIRM sees all firm leads. AGENT sees own only. |
| PATCH | /leads/:id/status | Lead recipient only | Update lead status |
| GET | /listings | FIRM/AGENT/SOLO_BROKER | Own listings with performance |
| GET | /agents | FIRM only | Agents under this firm |
| POST | /agents | FIRM only | Create agent sub-account |

### Uploads — /api/v1/uploads
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /signed-url | FIRM/AGENT/SOLO_BROKER/OWNER/ADMIN | Generate Cloudinary signed URL (5min expiry). Validates MIME type. |
| POST | /mandate | FIRM/AGENT/SOLO_BROKER/OWNER | Signed URL for mandate PDF. Stored in private Cloudinary folder. |

### Chat — /api/v1/chat
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /message | None (session) | Send message to AI qualification chat via n8n |
| GET | /session/:sessionId | None | Retrieve chat history |

### Admin — /api/v1/admin (ADMIN role only)
| Method | Path | Description |
|--------|------|-------------|
| GET | /users | All users with filters |
| PATCH | /users/:id/verify-rega | Mark REGA verified |
| PATCH | /users/:id/status | Activate/deactivate account |
| GET | /listings/pending | Draft listings awaiting review |
| PATCH | /listings/:id/approve | Set status ACTIVE |
| GET | /leads/quality | Lead quality metrics |
| POST | /listings | Seed listing on behalf of any broker |
| GET | /subscriptions | All subscriptions, revenue overview |
| POST | /featured | Create featured placement |

---

## INTENT SCORE FORMULA

```
score = 0
score += budget_specific ? 25 : 5       // 'under 800K SAR' = specific. 'I don't know' = not.
score += timeline_months <= 3 ? 25 : 10  // urgent buyer vs browser
score += Math.min(listings_viewed * 2, 20) // max 20 from browsing depth
score += Math.min(shortlisted_count * 10, 20) // max 20 from shortlisting
score += contact_provided ? 10 : 0      // voluntarily gave phone/email
// Result: 0-100. Lead triggered when score >= 40 AND buyer has viewed the listing
```

---

## BACKGROUND JOBS (BullMQ)

| Job | Trigger | Action | Retries |
|-----|---------|--------|---------|
| translate-listing | Listing saved with AR content | n8n → GPT-4o → writes EN fields | 3x backoff |
| send-lead-notification | Lead created | n8n → lead card → Twilio WhatsApp + Resend email | 3x backoff |
| increment-listing-views | Listing detail viewed | Increments views_count (batched) | 1x |
| calculate-intent-score | Buyer session updated | Recalculates intent_score | 2x |
| purge-listing-cache | Listing updated | Deletes Redis keys for that listing | 2x |
| verify-rega-licence | Broker signup | External REGA API check | 3x |
| expire-featured-listings | Nightly 2am | Sets is_featured=false where expired | 2x |
| expire-subscriptions | Nightly 2am | Sets is_active=false where expired | 2x |
| db-backup-s3 | Nightly 3am | pg_dump → gzip → S3 | 2x |
| broker-weekly-digest | Monday 9am | Weekly lead + listing performance email | 2x |

---

## CACHING STRATEGY (Upstash Redis)

| Data | TTL | Invalidation |
|------|-----|--------------|
| Listing search results | 30 seconds | On any listing write in that city+type |
| Single listing detail | 60 seconds | On that listing's update |
| Featured listings | 5 minutes | On any featured_placement change |
| Buyer feed (by sessionId) | 2 minutes | On new matching listing |
| Broker lead count | 5 minutes | On new lead for that broker |
| Rate limit counters | Sliding 1-min window | Auto-expire |
| User active status | 60 seconds | On account deactivation |

---

## RENDERING STRATEGY (Next.js)

| Route | Strategy | Why |
|-------|----------|-----|
| / | SSG (revalidate 1hr) | SEO critical, mostly static |
| /listings | SSR | Search results depend on query params |
| /listings/[id] | ISR (revalidate 60s) | Stable but needs freshness |
| /blog/[slug] | SSG | Fully static |
| /broker/* | CSR | Private, behind auth, no SEO |
| /admin/* | CSR | Private, ADMIN only |
| /auth/* | SSG | Static form pages |

---

## BILINGUAL / RTL RULES

- Two locales: `ar` (RTL) and `en` (LTR)
- URL structure: `/ar/listings` and `/en/listings`
- **ALWAYS use CSS logical properties:** `padding-inline-start` not `padding-left`, `margin-inline-end` not `margin-right`
- Chat bubbles: `dir='auto'` on every message
- Test Arabic from week 1 — retrofitting RTL after building LTR-only takes weeks

---

## CODE CONVENTIONS

```typescript
// API error response format — always
{ "success": false, "error": { "code": "LISTING_NOT_FOUND", "message": "Human readable message" } }

// API success response format — always
{ "success": true, "data": { ... } }

// HTTP status codes — use correctly
// 400 = bad input / validation error
// 401 = unauthenticated (no valid token)
// 403 = authenticated but forbidden (wrong role or not owner)
// 404 = resource not found
// 429 = rate limited
// 500 = server error

// Never: implicit any
// Never: raw SQL string concatenation
// Never: SELECT * in production queries
// Never: hard DELETE (always soft delete with deleted_at)
// Always: async/await with try/catch
// Always: BullMQ for side effects, not inline in request handlers
// Always: Zod schema before handler logic
// Always: role check before business logic
// Always: ownership check before any write operation
```

---

## MONOREPO STRUCTURE

```
/
├── apps/
│   ├── api/          # Fastify backend
│   │   └── src/
│   │       ├── index.ts
│   │       └── ...
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/
│           ├── components/
│           │   ├── chat/
│           │   ├── home/
│           │   ├── layout/   (Header.tsx, Footer.tsx)
│           │   └── listings/
│           ├── lib/
│           ├── messages/     (i18n translation files)
│           └── middleware.ts
├── packages/
│   └── shared/       # Shared types, schemas, constants
│       └── src/
│           ├── constants.ts
│           ├── schemas.ts    (Zod schemas shared between API and web)
│           ├── types.ts
│           └── utils.ts
├── ARCHITECTURE.md   (this file)
├── SECURITY.md
├── turbo.json
└── pnpm-workspace.yaml
```

---

*This document is the single source of truth for architecture decisions. Any code generated must be consistent with the schema, API routes, role permissions, and technology choices defined here. When in doubt, ask — do not invent new patterns.*
