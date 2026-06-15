# Saudi Real Estate Platform — API Documentation

This document serves as the **Single Source of Truth** for the current state of the backend API (`apps/api`). It is designed to help the core development team and the mobile app freelancer understand how to integrate with the platform.

---

## 🌐 Global API Standards

### 1. Base URL
* **Local Development:** `http://localhost:3001/api/v1`
* **Staging/Production:** *(Refer to your specific deployment URL, e.g., on Railway)*

### 2. Request & Response Formats
All requests and responses use **JSON** format.
* **Success Format:**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
* **Error Format:**
  ```json
  {
    "success": false,
    "error": "Validation Error",
    "message": "Human-readable error description",
    "details": [ ... ] // validation failure arrays if applicable
  }
  ```

### 3. Authentication & Authorization
* **JSON Web Tokens (JWT):** Passed via the standard Authorization header.
  ```http
  Authorization: Bearer <access_token>
  ```
* **Refresh Tokens:** Handled via secure, HTTP-only `refreshToken` cookies for web clients. 
  > [!TIP]
  > **Mobile Client Note:** Mobile clients (React Native/Flutter) do not handle HTTP-only cookies out-of-the-box like browsers do. The mobile developer should store the `refreshToken` securely in the device's secure storage (e.g., Apple Keychain / Android Keystore) and explicitly attach it or handle refreshes.
* **User Roles:**
  * `ADMIN` (Full system administrator)
  * `FIRM` (Real estate company; manages multiple agents)
  * `AGENT` (Independent broker listing under a Firm)
  * `SOLO_BROKER` (Independent self-managed broker)
  * `OWNER` (Individual property owner)
  * `BUYER` (General buyer / searcher)

---

## 🔑 1. Authentication Module (`/auth`)
* **Endpoint Group Prefix:** `/api/v1/auth`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/register` | None | Multi-role registration (Buyer, Broker, Firm, Agent, Owner). Professional roles start as inactive pending admin verification. |
| **POST** | `/login` | None | Credential-based login. Returns `accessToken` + sets secure `refreshToken` HTTP-only cookie. |
| **GET** | `/google/callback` | None | Google OAuth callback handler. Creates/logs in standard `BUYER` and redirects. |
| **GET** | `/me` | Yes (`Bearer`) | Retrieve current logged-in user details (credits balance, REGA status, etc.). |
| **POST** | `/refresh` | None (reads cookie) | Exchanges refresh token for a new short-lived access token. |
| **POST** | `/forgot-password` | None | Requests a 6-digit recovery OTP code sent to the email. Returns a reset session JWT token. |
| **POST** | `/reset-password` | None | Resets user password using the OTP code and reset session token. |
| **POST** | `/logout` | None | Clears token cookies. |

---

## 🏡 2. Property Listings Module (`/listings`)
* **Endpoint Group Prefix:** `/api/v1/listings`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Optional | Public search listings with query param filters (city, district, price limits, type, etc.). |
| **GET** | `/upload-signature` | Yes | Generates a Cloudinary signature for direct client-side photo uploading. |
| **GET** | `/:id` | Optional | Public listing detail view. Increments views count asynchronously. |
| **POST** | `/` | Yes | Create a new draft/un-published listing. |
| **PUT** | `/:id` | Yes (Owner/Admin) | Update listing information. Supports partial updates. |
| **DELETE** | `/:id` | Yes (Owner/Admin) | Soft delete listing (sets `deletedAt`). |
| **POST** | `/:id/publish` | Yes (Owner) | Publishes draft listing by deducting required broker credits. |
| **POST** | `/:id/reveal` | Yes (Buyer) | Reveals the private contact number of the lister. Forbidden (`403`) unless buyer is AI-Qualified. |
| **GET** | `/projects` | Yes | Retrieve a list of all compound/real estate development projects. |
| **POST** | `/projects` | Yes | Create a new real estate project. |
| **GET** | `/:id/units` | Optional | Retrieve inventory unit details connected to a project listing. |
| **POST** | `/:id/units` | Yes | Bulk upload/create units linked to a project listing. |
| **PUT** | `/:id/units/:unitId` | Yes | Edit inventory unit status (`AVAILABLE`, `SOLD`, etc.) or details. |
| **DELETE** | `/:id/units/:unitId` | Yes | Remove unit from inventory. |
| **POST** | `/:id/feature` | Yes | Promote a listing to featured status using credits (duration 7 or 30 days). |

---

## 👤 3. User & Profiles Module (`/user`)
* **Endpoint Group Prefix:** `/api/v1/user`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/verify-professional` | Yes (Broker) | Submits REGA Falcon License number or Tourism Permit for manual approval. |
| **GET** | `/dashboard-stats` | Yes | Returns aggregate statistics (number of listings, views, leads) for dashboard views. |
| **GET** | `/profile` | Yes | Retrieve detailed personal profile parameters along with verification status. |
| **PATCH** | `/profile` | Yes | Universal profile updates (name, phone, gender, nationality, city, avatar, bio). |
| **POST** | `/purchase-credits` | Yes | Simulates purchasing broker credits in sandbox. |
| **GET** | `/public-broker/:id` | None | Public profile endpoint for individual brokers (shows active listings count, stats). |
| **GET** | `/public-firm/:id` | None | Public profile for real estate firms (lists sub-agents, aggregate listings count). |

---

## ❤️ 4. Favorites Module (`/favorites`)
* **Endpoint Group Prefix:** `/api/v1/favorites`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/toggle` | Yes | Toggles bookmark/favorite status of a property listing. |
| **POST** | `/news/toggle` | Yes | Toggles bookmark/favorite status of a news article. |
| **GET** | `/` | Yes | Get the list of all property favorites for the current user. |
| **GET** | `/news` | Yes | Get the list of all news/blog favorites for the current user. |

---

## 💬 5. AI Assistant & Chat proxy (`/chat` & `/ai`)
* **Endpoint Group Prefix:** `/api/v1/ai` & `/api/v1/system`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/system/chat` | Yes | Secure proxy routes messaging payload to n8n AI agent workflows while concealing webhook secrets. |
| **GET** | `/system/chat/history` | Yes | Fetch persistent buyer chat history log. |
| **POST** | `/ai/translate` | Yes | Translates descriptions/bios between English and Arabic. |
| **POST** | `/ai/generate-title` | Yes | AI generation for professional broker headlines. |

---

## 💼 6. CRM Module (`/crm`)
* **Endpoint Group Prefix:** `/api/v1/crm`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/agents` | Yes (`ADMIN` only) | List active agents/brokers for lead assignment dropdowns. |
| **GET** | `/followups/today` | Yes | Get active followup reminders due today for the logged-in agent. |
| **PATCH** | `/followups/:id/complete` | Yes | Complete a scheduled followup callback task. |
| **GET** | `/website-leads` | Yes | List AI-Qualified website leads assigned to this broker. |
| **GET** | `/website-leads/:id` | Yes | View website lead detail: chat history, CRM notes, activity logs, and followups. |
| **PATCH** | `/website-leads/:id/status` | Yes | Update website lead status (`NEW`, `CONTACTED`, `CLOSED_WON`, `CLOSED_LOST`). |
| **PATCH** | `/website-leads/:id/assign` | Yes (`ADMIN` only) | Assign website lead to an agent. |
| **POST** | `/website-leads/:id/notes` | Yes | Add note to website lead. |
| **PATCH** | `/notes/:id` | Yes | Edit an existing note (Must be author, assigned agent, or admin). |
| **POST** | `/website-leads/:id/followups` | Yes | Schedule followup task. |
| **POST** | `/website-leads/:id/whatsapp` | Yes | Log WhatsApp contact attempt. |
| **GET** | `/campaign-leads` | Yes | List manual / ad-campaign leads assigned to agent. |
| **POST** | `/campaign-leads` | Yes | Create manual lead card entry (runs duplicate checks on phone number). |
| **GET** | `/campaign-leads/:id` | Yes | View campaign lead details, notes, activities, followups. |
| **PATCH** | `/campaign-leads/:id/status` | Yes | Update campaign lead status. |
| **PATCH** | `/campaign-leads/:id/assign` | Yes (`ADMIN` only) | Assign campaign lead to agent. |
| **PATCH** | `/campaign-leads/:id/score` | Yes | Update lead score (0-5 stars). |
| **POST** | `/campaign-leads/:id/notes` | Yes | Add note to campaign lead. |
| **POST** | `/campaign-leads/:id/followups` | Yes | Schedule followup task. |
| **POST** | `/campaign-leads/:id/whatsapp` | Yes | Log WhatsApp contact attempt. |
| **DELETE** | `/campaign-leads/:id` | Yes (`ADMIN` only) | Delete campaign lead. |
| **GET** | `/dashboard` | Yes | Dashboard overview (pipeline by status, source counts, today's followups). |
| **GET** | `/settings` | Yes (`ADMIN` only) | Webhook token settings for ad campaigns. |
| **PUT** | `/settings/:key` | Yes (`ADMIN` only) | Update webhook tokens. |
| **GET** | `/webhooks/meta` | None | Public hub challenge validation webhook. |
| **POST** | `/webhooks/meta` | None | Public payload webhook receiver (adds Meta Lead Ads directly to campaign leads). |

---

## 🏢 7. Firm Management Module (`/firm`)
* **Endpoint Group Prefix:** `/api/v1/firm`

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/brokers` | Yes (`FIRM` only) | List all brokers belonging to this firm, along with their listing stats and credit balances. |
| **POST** | `/brokers/:id/credits` | Yes (`FIRM` only) | Transfer credits from firm to a specific agent. |
| **POST** | `/brokers/:id/reclaim` | Yes (`FIRM` only) | Reclaim credits from a broker back to the firm's balance. |

---

## 📄 8. Legal & News Pages (`/legal` & `/news`)

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/legal/:slug` | None | Public: Retrieve details of a legal page (Privacy Policy, Terms). |
| **PUT** | `/legal/:slug` | Yes (`ADMIN` only) | Create or update a legal page. |
| **GET** | `/news` | None | Public: List all published news blog articles. |
| **GET** | `/news/admin` | Yes (`ADMIN` only) | List all news posts (drafts + published). |
| **GET** | `/news/:slug` | Optional | Public: Retrieve single news post by slug. |
| **POST** | `/news` | Yes (`ADMIN` only) | Create news post. |
| **PATCH** | `/news/:id` | Yes (`ADMIN` only) | Update news post. |
| **DELETE** | `/news/:id` | Yes (`ADMIN` only) | Delete news post. |

---

## ⚙️ 9. System Config & Callbacks (`/system`)
* **Endpoint Group Prefix:** `/api/v1/system`
* *Note: Many endpoints are accessed securely by n8n workflows using webhook signature headers.*

| Method | Path | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/settings` | None | Public: Get social links, contact numbers, active plans settings. |
| **GET** | `/faqs` | None | Public: List FAQ cards sorted by display order. |
| **POST** | `/contact` | None | Public: Submit a support/contact inquiry form. |
| **POST** | `/faqs` | Yes (`ADMIN` only) | Create new FAQ entry. |
| **PUT** | `/faqs/:id` | Yes (`ADMIN` only) | Update FAQ entry. |
| **DELETE** | `/faqs/:id` | Yes (`ADMIN` only) | Delete FAQ entry. |
| **POST** | `/settings` | Yes (`ADMIN` only) | Update multiple system configuration keys at once. |
| **GET** | `/user-context` | Webhook Secret | Called by n8n to retrieve returning buyer profiles. |
| **GET** | `/listing-details/:id` | Webhook Secret | Called by n8n to provide specific property briefs to the AI model. |
| **POST** | `/buyer-profile` | Webhook Secret | n8n callback to update a buyer's profiling criteria. |
| **POST** | `/qualify-lead` | Webhook Secret | n8n callback to mark a buyer as AI-Qualified and trigger broker notification. |
| **POST** | `/mismatch-profile` | Webhook Secret | n8n callback to mark a buyer as mismatched (unqualified) for this listing. |
| **GET** | `/test-qualify` | Yes (`ADMIN` only) | Security sandbox route to force qualification for listing tests. |
| **POST** | `/chat/log` | Webhook Secret | n8n callback to sync conversational chat history into the SQL database. |
| **PATCH** | `/buyer-profile/:id/summary`| Webhook Secret | n8n callback to save the generated AI interaction summary. |

---

## 👑 10. Admin Override Console (`/admin`)
* **Endpoint Group Prefix:** `/api/v1/admin`
* *All endpoints below require authentication with the `ADMIN` role.*

| Method | Path | Description |
| :--- | :--- | :--- |
| **GET** | `/stats` | Admin panel dashboard overview (growth rates, active items, total users). |
| **GET** | `/users` | List all system users with filters (status, search query, role). |
| **POST** | `/users/:id/approve` | Approve verification request (marks REGA verified, activates account). |
| **POST** | `/users/:id/reject` | Reject application. Reverts user role back to `BUYER` (revoking CRM access). |
| **POST** | `/users/:id/suspend` | Suspends or unsuspends user credentials. |
| **PATCH** | `/users/:id/credits` | Adjust an agent/firm credit balance. |
| **PATCH** | `/users/:id/subscription`| Adjust user subscription tier (`FREE`, `PRO`, `ELITE`). |
| **GET** | `/listings` | List all listings on the platform (including unpublished drafts). |
| **PATCH** | `/listings/:id/status` | Approve listings or change status. |
| **PATCH** | `/listings/:id/toggle-ai`| Force toggle AI-Qualification requirements on specific properties. |
| **POST** | `/listings/:id/feature` | Feature listing with custom expiry dates. |
| **DELETE** | `/listings/:id/feature`| Un-feature a property. |
| **PATCH** | `/listings/:id/featured-order` | Reorder listing sequence in featured pages. |
| **PATCH** | `/listings/:id/featured-expiry`| Modify the featured expiry date. |
| **DELETE** | `/:id` | Hard override listing delete. |
| **GET** | `/settings` | Retrieve all settings keys. |
| **PUT** | `/settings/:key` | Force update any system settings key. |
| **GET** | `/legal` | List all legal files. |
| **PUT** | `/legal/:slug` | Create or override legal files. |
| **GET** | `/news` | List all news posts. |
| **POST** | `/news` | Create news post. |
| **PATCH** | `/news/:id` | Update news post. |
| **DELETE** | `/news/:id` | Delete news post. |
| **GET** | `/contact-submissions`| List contact form submissions. |
| **PATCH** | `/contact-submissions/:id/toggle`| Toggle replied flag on submission. |
| **DELETE** | `/contact-submissions/:id`| Remove contact submission. |
| **GET** | `/leads` | List all system leads, conversion rates, and intent scores. |
| **GET** | `/leads/:id/chat-history` | View chat logs of a specific qualified lead. |
| **PATCH** | `/leads/:id/status` | Force update lead status. |
| **PATCH** | `/users/:id` | Edit user profile columns. |
| **POST** | `/users` | Create user account manually. |

---

## 🛠️ Mobile Developer Integration Checklist

When transferring these specs to the mobile developer, ensure they complete the following items:

1. **Authentication Token Lifecycle:**
   * Access tokens expire in 15 minutes. The mobile client must listen for `401 Unauthorized` responses and issue a `POST /auth/refresh` request automatically.
   * Securely store tokens using platform tools (Keychain / Keystore). Do not use insecure local storage.
2. **Handling Direct Cloudinary Uploads:**
   * Instead of uploading heavy image files to the Fastify server, the mobile app must request a signed URL (`GET /listings/upload-signature`), POST the image to Cloudinary, and pass the resulting string url to `POST /listings`.
3. **Bilingual Layouts (LTR vs RTL):**
   * The backend API operates in both Arabic and English. Titles, descriptions, and AI interactions return bilingual formats. Ensure the mobile framework changes interface layouts dynamically based on system localization.
4. **n8n Webhook / AI Chat Integration:**
   * When creating chat bubbles for the AI chat agent, connect to the `/chat` route. Keep session track variables updated to enable the backend to calculate buyer intent scores dynamically.
