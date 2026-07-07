# Build Spec: Eligibility & Next-Steps Wizard (Lead Capture Feature)

Audience: engineering. This is meant to be handed to whoever builds the feature — it specifies exact copy, exact flow, data schema, API contracts, and integration points. Where the reference tool used a specific real-estate example, this spec keeps that vertical (Saudi property ownership) since that's the proven use case, but every screen is written generically enough to reuse for other verticals by swapping the config.

---

## 0. What we're building, in one sentence

A config-driven, multi-step branching form that (a) captures a lead's contact details up front, (b) asks 1–2 qualifying questions, (c) shows a personalized "next steps" result with real official links, and (d) sends the combined contact + qualification payload to our CRM the moment a result is reached — with partial-lead capture so we don't lose people who drop off mid-flow.

---

## 1. Full screen-by-screen content

Use this copy as-is, or treat it as the first config entry (see §3 for how this maps to JSON).

### Screen 1 — Contact details (always first, mandatory)

**Eyebrow:** Eligibility & Next Steps
**Headline:** Find your path to ownership
**Subhead:** 3 quick questions · about 2 minutes · official government links included

**Panel title:** Let's start with your details
**Panel subtext:** So our team can follow up with guidance tailored to your situation. It only takes a moment.

Fields:
| Field | Type | Required | Placeholder | Notes |
|---|---|---|---|---|
| Full name | text | yes | e.g. Ahmed Khan | |
| Email address | email | yes | you@example.com | RFC-basic regex client-side, real MX/format check server-side |
| Phone / WhatsApp | tel + country picker | yes | varies by country (see §4.3) | default dial code +966 (Saudi Arabia) |
| Citizenship | select | yes | Select your country of citizenship | GCC + common countries pinned at top, full list below a divider |
| Consent checkbox | checkbox | yes | — | "I agree to be contacted about property ownership in Saudi Arabia, and I accept the Terms & Conditions and Privacy Policy for processing my personal data." — link both docs |

CTA button: **Continue →**

### Screen 2 — Residency status

**Panel title:** Where are you based right now?
**Panel subtext:** This determines how you'll verify your identity with the Saudi authorities.

Two cards, single-select, auto-advance ~200ms after selection:

- **Card A — "Outside the Kingdom"**
  Icon: globe. Body: "A non-Saudi living abroad, with no current residency inside Saudi Arabia."
- **Card B — "Inside Saudi Arabia"**
  Icon: house. Body: "A non-Saudi holding standard or premium residency, or a Gulf national or diplomat inside the Kingdom."

→ If **B (Inside)** is selected: skip Screen 3, go straight to **Result C (Resident)**.
→ If **A (Outside)** is selected: go to Screen 3.

Back button: **← Back** (returns to Screen 1, contact data preserved in state).

### Screen 3 — Digital identity status (only shown if "Outside the Kingdom")

**Panel title:** Do you already have a Saudi digital identity?
**Panel subtext:** A digital identity (issued via Nafath / Absher) is what lets you sign in and complete the purchase online.

Two cards, single-select, auto-advance:

- **Card A — "Yes, I have one"**
  Icon: ID card. Body: "I've already been issued a Saudi digital identity number."
- **Card B — "Not yet"**
  Icon: ID card with a line through it. Body: "I still need to apply for a Saudi digital identity."

→ **A (Yes)** → **Result A (Non-resident, has digital ID)**
→ **B (No)** → **Result B (Non-resident, needs digital ID)**

Back button: **← Back** (returns to Screen 2).

### Result A — Non-resident, has digital ID

**Header badge:** checkmark icon
**Eyebrow:** Your next steps
**Headline:** Register on the Saudi Real Estate Portal
**Subtext:** You already have a digital identity, so you're ready to set up your account and start viewing properties through licensed channels.
**Tags shown:** `Individual` · `Non-resident` · `Digital ID ready`

Steps:
1. Install the **Nafath** app on your phone and sign in with your existing digital identity.
2. Open **Register New Account** on the Saudi Properties portal → https://saudiproperties.rega.gov.sa/auth/user-type — select **Individual**, then **Individual Beneficiary**, and enter your digital identity number.
3. Browse our project listings and shortlist what you're looking for.
4. Contact us — we take it from step 1 all the way to closing the deal.

CTA block: "With you every step" → **Talk to a specialist →**

### Result B — Non-resident, no digital ID yet

**Header badge:** ID-card icon
**Eyebrow:** Your next steps
**Headline:** Issue your Saudi digital identity
**Subtext:** Before you can register on the portal, you'll set up a Saudi digital identity from abroad. Here's the full sequence, with official links for each stage.
**Tags shown:** `Individual` · `Non-resident` · `Needs digital ID`

Steps:
1. Create an account on the **Ministry of Foreign Affairs portal** → https://verify.mofa.gov.sa/ — enter your details/documents and book an appointment at a Saudi mission near you.
2. Attend your appointment at the Saudi representation abroad, submit the required documents, and complete biometric registration.
3. Once approved, you'll be notified that your digital identity has been issued.
4. Order an eSIM from an approved **Saudi telecom provider** → https://www.cst.gov.sa/en/ (regulator listing of licensed providers) so you have a Saudi number while still abroad.
5. Open the **Nafath** app and use it to activate the eSIM.
6. Sign in to the **Absher platform** → https://www.absher.sa/ to switch on your digital identity. Once active, you're ready to register on the Real Estate Portal.

CTA block: "We'll guide you through it" → **Talk to a specialist →**

### Result C — Resident inside the Kingdom

**Header badge:** checkmark icon
**Eyebrow:** Your next steps
**Headline:** Register on the Saudi Real Estate Portal
**Subtext:** As a resident inside the Kingdom, you can register and verify straight away using your residency number through Nafath.
**Tags shown:** `Individual` · `Resident`

Steps:
1. Open **Register New Account** → https://saudiproperties.rega.gov.sa/auth/user-type — select **Individual**, then **Individual Beneficiary**.
2. Sign in through **Nafath** using your residency (Iqama) number.
3. Browse our project listings and shortlist what you're looking for.
4. Contact us — we take it from step 1 all the way to closing the deal.

CTA block: "Right here in the Kingdom" → **Talk to a specialist →**

### Trust strip (shown under the wizard, all states)

"Official Saudi government services" + logos/labels: **Nafath** · **Absher** · **REGA · Saudi Properties** · **Ministry of Foreign Affairs**

Footer disclaimer text: "This guide is provided by [Our Company] to help you understand the ownership process. The official steps and forms are operated by the Real Estate General Authority (REGA) and related Saudi government bodies via the Saudi Properties portal (https://saudiproperties.rega.gov.sa/). Eligibility for specific properties and zones may vary; speak to our team for advice on your situation."

---

## 2. Reference URLs to hardcode into config (all official government sources)

| Purpose | URL |
|---|---|
| REGA / Saudi Properties — register new account | `https://saudiproperties.rega.gov.sa/auth/user-type` |
| REGA / Saudi Properties — portal home | `https://saudiproperties.rega.gov.sa/` |
| Ministry of Foreign Affairs — identity verification portal | `https://verify.mofa.gov.sa/` |
| CST — Communications, Space & Technology Commission (licensed telecom providers) | `https://www.cst.gov.sa/en/` |
| Absher platform | `https://www.absher.sa/` |

Keep these in config, not hardcoded in components, since government URLs occasionally get restructured.

---

## 3. Data model — make the flow config-driven, not hardcoded

Don't hand-code the branching in components. Define it as data so content/routing changes don't need a deploy.

```json
{
  "wizardId": "buy-in-saudi-eligibility",
  "steps": [
    {
      "id": "contact",
      "type": "form",
      "title": "Let's start with your details",
      "subtitle": "So our team can follow up with guidance tailored to your situation.",
      "fields": [
        { "id": "fullName", "type": "text", "label": "Full name", "required": true },
        { "id": "email", "type": "email", "label": "Email address", "required": true },
        { "id": "phone", "type": "phone", "label": "Phone / WhatsApp", "required": true, "defaultDialCode": "+966" },
        { "id": "citizenship", "type": "select", "label": "Citizenship", "required": true, "optionsSource": "countryList" }
      ],
      "next": "residency"
    },
    {
      "id": "residency",
      "type": "choice",
      "title": "Where are you based right now?",
      "subtitle": "This determines how you'll verify your identity with the Saudi authorities.",
      "options": [
        { "value": "outside", "label": "Outside the Kingdom", "body": "A non-Saudi living abroad, with no current residency inside Saudi Arabia.", "icon": "globe", "next": "digitalId" },
        { "value": "inside", "label": "Inside Saudi Arabia", "body": "A non-Saudi holding standard or premium residency, or a Gulf national or diplomat inside the Kingdom.", "icon": "home", "next": "result:resident" }
      ]
    },
    {
      "id": "digitalId",
      "type": "choice",
      "title": "Do you already have a Saudi digital identity?",
      "subtitle": "A digital identity (issued via Nafath / Absher) is what lets you sign in and complete the purchase online.",
      "options": [
        { "value": "yes", "label": "Yes, I have one", "body": "I've already been issued a Saudi digital identity number.", "icon": "id-card", "next": "result:nonresident-id" },
        { "value": "no", "label": "Not yet", "body": "I still need to apply for a Saudi digital identity.", "icon": "id-card-off", "next": "result:nonresident-noid" }
      ]
    }
  ],
  "results": {
    "resident": {
      "headline": "Register on the Saudi Real Estate Portal",
      "subtext": "As a resident inside the Kingdom, you can register and verify straight away using your residency number through Nafath.",
      "tags": ["Individual", "Resident"],
      "steps": [
        { "text": "Open Register New Account and select Individual, then Individual Beneficiary.", "link": "https://saudiproperties.rega.gov.sa/auth/user-type" },
        { "text": "Sign in through Nafath using your residency (Iqama) number." },
        { "text": "Browse our project listings and shortlist what you're looking for.", "link": "/projects" },
        { "text": "Contact us — we take it from step 1 all the way to closing the deal." }
      ],
      "ctaLabel": "Talk to a specialist →",
      "leadTags": ["individual", "resident"]
    },
    "nonresident-id": {
      "headline": "Register on the Saudi Real Estate Portal",
      "subtext": "You already have a digital identity, so you're ready to set up your account and start viewing properties through licensed channels.",
      "tags": ["Individual", "Non-resident", "Digital ID ready"],
      "steps": [
        { "text": "Install the Nafath app and sign in with your existing digital identity." },
        { "text": "Open Register New Account, select Individual then Individual Beneficiary, and enter your digital identity number.", "link": "https://saudiproperties.rega.gov.sa/auth/user-type" },
        { "text": "Browse our project listings and shortlist what you're looking for.", "link": "/projects" },
        { "text": "Contact us — we take it from step 1 all the way to closing the deal." }
      ],
      "ctaLabel": "Talk to a specialist →",
      "leadTags": ["individual", "non-resident", "has-digital-id"]
    },
    "nonresident-noid": {
      "headline": "Issue your Saudi digital identity",
      "subtext": "Before you can register on the portal, you'll set up a Saudi digital identity from abroad.",
      "tags": ["Individual", "Non-resident", "Needs digital ID"],
      "steps": [
        { "text": "Create an account on the Ministry of Foreign Affairs portal and book an appointment at a Saudi mission near you.", "link": "https://verify.mofa.gov.sa/" },
        { "text": "Attend your appointment, submit documents, and complete biometric registration." },
        { "text": "Once approved, you'll be notified your digital identity has been issued." },
        { "text": "Order an eSIM from an approved Saudi telecom provider.", "link": "https://www.cst.gov.sa/en/" },
        { "text": "Open the Nafath app and use it to activate the eSIM." },
        { "text": "Sign in to Absher to switch on your digital identity.", "link": "https://www.absher.sa/" }
      ],
      "ctaLabel": "Talk to a specialist →",
      "leadTags": ["individual", "non-resident", "needs-digital-id"]
    }
  }
}
```

Building it this way means: a new question, a 4th outcome, or a different vertical (e.g. "Buy in Dubai") is a new JSON file, not a code change.

---

## 4. Frontend implementation

### 4.1 Stack recommendation
React (or whatever the rest of the platform uses) with local component state — this doesn't need Redux/global state, it's a self-contained widget. Server components/SSR not needed; render client-side, mount on the page.

### 4.2 Component tree
```
<EligibilityWizard config={wizardConfigJson}>
  <ProgressStepper currentStep totalSteps hasResult />
  <StepRenderer>
      → <ContactFormStep />          (step.type === "form")
      → <ChoiceStep />               (step.type === "choice", renders N cards)
      → <ResultPanel />              (when a result is reached)
  </StepRenderer>
  <TrustStrip />                      (official gov links, always visible)
</EligibilityWizard>
```

State to track: `currentStepId`, `answers: {}` (accumulates every field/choice as the user progresses), `leadId` (see §5.1 — assigned as soon as step 1 is submitted, so later steps can `PATCH` the same lead record instead of creating duplicates).

### 4.3 Field validation

- **Email:** client-side `^[^\s@]+@[^\s@]+\.[^\s@]+$` for instant feedback; **always re-validate server-side** with a stricter check (proper regex or a library) before writing to DB/CRM.
- **Phone:** use `libphonenumber-js` (or platform equivalent) keyed off the selected dial code, instead of hand-rolled per-country digit counts — it's more accurate and covers every country, not just the dozen the reference tool hardcoded.
- **Consent checkbox:** required, block submit if unchecked, show inline error (don't just disable the button silently — reference tool used an outline highlight, which is fine).
- **Required-field errors:** show inline under each field, not just a toast, so the user can see exactly what's missing.

### 4.4 Country dial-code picker
Searchable dropdown, default to the business's home market's dial code. Use a maintained country-data package (e.g. `country-codes-list` or `world-countries`) rather than a hand-maintained array, so additions/flag emoji stay correct.

### 4.5 Transitions / UX details worth keeping
- Auto-advance ~150–250ms after a card is clicked (shows the selection highlight briefly before moving on) — feels responsive without feeling instant/jarring.
- Every result/step panel scrolls the wizard card into view on transition (not the whole page) so users don't lose their place.
- "Start over" resets `answers` and returns to the residency question (not all the way back to contact info — no reason to make them retype their name once captured).

---

## 5. Backend / API contract

### 5.1 Endpoints

```
POST /api/leads/wizard/start
  body: { wizardId, fullName, email, phone, citizenship, consent }
  → creates a lead record with status "in_progress"
  → returns { leadId }

PATCH /api/leads/wizard/:leadId/answer
  body: { stepId, value }             // e.g. { stepId: "residency", value: "outside" }
  → appends to the lead's answers, updates status if needed
  → call this after EVERY step, not just at the end — this is what fixes the
    "abandoned mid-flow = lost lead" gap from the reference implementation

POST /api/leads/wizard/:leadId/complete
  body: { resultKey }                 // e.g. "nonresident-noid"
  → marks lead "completed", attaches resultKey + computed leadTags
  → triggers the CRM sync (server-side, see 5.3)
  → returns { ok: true }
```

Sending the contact record the moment step 1 is submitted (not waiting for the full flow) is the single biggest functional upgrade over the reference tool — it means a visitor who fills their name/email and closes the tab before answering the branching questions is still captured as a lead, just tagged `status: in_progress` instead of `completed`. Sales can still follow up on those, just with less context.

### 5.2 Data model (lead record)

```json
{
  "leadId": "uuid",
  "wizardId": "buy-in-saudi-eligibility",
  "status": "in_progress | completed | abandoned",
  "fullName": "string",
  "email": "string",
  "phone": "string (E.164 format)",
  "citizenship": "string",
  "consent": true,
  "answers": { "residency": "outside", "digitalId": "no" },
  "resultKey": "nonresident-noid",
  "leadTags": ["individual", "non-resident", "needs-digital-id"],
  "source": "buy-in-saudi-eligibility",
  "createdAt": "iso8601",
  "updatedAt": "iso8601",
  "crmSyncedAt": "iso8601 | null"
}
```

### 5.3 CRM / webhook integration — proxy it server-side

Do **not** call the CRM webhook directly from the browser (that's the security gap in the reference implementation — its webhook URL is sitting in plain view in the page source with no auth). Instead:

```
Browser → our backend (/api/leads/wizard/*) → our backend calls the CRM webhook server-side
```

Backend, on `complete`:
1. Look up the lead record.
2. Build the CRM payload (first/last name split, E.164 phone, citizenship, answers, resultKey, leadTags, source).
3. `POST` to the CRM webhook **with a server-held secret/API key** (not embedded anywhere the browser can read), with a retry-with-backoff if the CRM endpoint is momentarily down, and log failures to a dead-letter queue so no lead silently disappears if the CRM call fails.
4. Mark `crmSyncedAt` on success.

### 5.4 Deduplication — do this in the database, not localStorage

Reference tool relies on browser `localStorage` for a 24h "don't resend" window, which is easily bypassed (private browsing, different device, cleared storage) and doesn't actually prevent duplicate CRM records.

Real approach:
- Unique constraint (or upsert-on-conflict) on `email` (normalized: lowercased, trimmed) within the `leads` table for a given `wizardId`.
- On a repeat submission from the same email within a configurable window (e.g. 24h), **update** the existing record (merge new answers, bump `updatedAt`) instead of creating a new one, and skip re-sending to the CRM unless the `resultKey` actually changed (e.g. they came back and gave different answers).
- This also means: if someone starts the wizard twice with the same email but different answers, you get one clean, up-to-date lead record, not two duplicate CRM entries.

### 5.5 Analytics events to fire (client-side, in addition to the API calls above)

| Event | When |
|---|---|
| `wizard_started` | wizard first rendered/scrolled into view |
| `wizard_step_completed` | any step submitted, include `stepId` |
| `wizard_step_abandoned` | (optional, harder to get reliably) fire on `beforeunload` if a step was reached but not the final result |
| `wizard_result_shown` | a result panel renders, include `resultKey` |
| `wizard_cta_clicked` | "Talk to a specialist" clicked from a result panel |

Feed these into whatever analytics stack the platform already uses (GA4/PostHog/etc.) — the point of per-step events (vs. one single "lead submitted" event like the reference tool has) is being able to see exactly where in the funnel people drop off.

---

## 6. Security / correctness checklist before shipping

- [ ] Server-side validation on every field (email, phone, required fields) — never trust client-side checks alone.
- [ ] CRM webhook credentials live only on the backend, never shipped in frontend JS/HTML.
- [ ] Rate-limit `/api/leads/wizard/start` per IP to prevent spam/bot submissions.
- [ ] Dedup logic lives in the database with a real unique constraint, not `localStorage`.
- [ ] Partial leads (`status: in_progress`) are captured and visible to sales, not just completed ones.
- [ ] Consent checkbox is actually required server-side too (don't accept a `complete` call without `consent: true` on the original `start` payload).
- [ ] All official government links point to real hostnames only (`rega.gov.sa`, `mofa.gov.sa`, `cst.gov.sa`, `absher.sa`) — validate this in config so a typo doesn't silently point users somewhere wrong.
- [ ] Failed CRM syncs are logged/retried, not silently swallowed (`.catch(() => {})` is fine for analytics pings, not for the actual lead sync).
