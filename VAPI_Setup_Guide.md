# Saudi RE — VAPI Voice Qualification: Complete Setup Guide

---

## Overview

This system automatically calls every Meta Ads lead the moment they submit a form, qualifies them using an AI voice agent (Sara), and logs the result directly into your CRM. No human intervention needed until a lead is already qualified.

**Two webhook URLs you will get from n8n:**
- `POST /webhook/vapi-meta-lead` — receives the incoming lead form
- `POST /webhook/vapi-call-result` — receives VAPI's end-of-call report

---

## STEP 1 — VAPI Account Setup

### 1.1 Create your VAPI account
1. Go to https://vapi.ai and sign up
2. Navigate to **Dashboard → Billing** and add a payment method
3. Recommended: start with $20 credit to test (each call costs ~$0.10–0.30)

### 1.2 Get a Phone Number
1. Go to **Phone Numbers → Buy Number**
2. Select **Saudi Arabia (+966)** if available, otherwise select a US or UK number
3. Note down the **Phone Number ID** — you will need it as `VAPI_PHONE_NUMBER_ID`

> If a Saudi number is not available on VAPI directly, use **Twilio** to buy a Saudi number and connect it to VAPI under Phone Numbers → Import Twilio Number.

### 1.3 Create the Assistant
1. Go to **Assistants → Create Assistant**
2. Name it: `Saudi RE — Sara`
3. Set **Assistant Type**: `Outbound`
4. Under **Model**, choose:
   - Provider: `OpenAI`
   - Model: `gpt-4o-mini` (best cost/quality ratio)
   - Temperature: `0.4` (keeps responses focused, not creative)
5. Under **Voice**, choose:
   - Provider: `ElevenLabs`
   - Voice: `Rachel` or `Sarah` (professional female, neutral accent)
   - Stability: `0.5`
   - Similarity Boost: `0.75`
6. **First Message** (leave blank here — n8n will inject this dynamically per call)
7. **System Prompt** (leave blank here — n8n injects dynamically per call)
8. Under **Call Settings**:
   - Max Duration: `360` seconds (6 minutes hard limit)
   - End Call Message: `Thank you for your time. Our team will follow up with you shortly. Goodbye!`
   - End Call Phrases: `goodbye, bye, not interested, please remove my number, wrong number`
9. Under **Advanced → Silence Timeout**: `30` seconds
10. Save the assistant and note the **Assistant ID** — you need it as `VAPI_ASSISTANT_ID`

### 1.4 Configure the End-of-Call Webhook
1. Go to **Assistants → Sara → Server URL**
2. Paste your n8n webhook URL: `https://your-n8n-instance.com/webhook/vapi-call-result`
3. Under **Server Events**, enable:
   - `end-of-call-report` ✅
   - `call-started` (optional, for logging)
4. Save

### 1.5 Get your API Key
1. Go to **Account → API Keys → Generate Key**
2. Copy the key — this is your `VAPI_API_KEY`

---

## STEP 2 — n8n Setup

### 2.1 Import the Workflow
1. Open your n8n instance
2. Go to **Workflows → Import from File**
3. Upload `Saudi_RE_VAPI_Voice_Qualification.json`
4. The workflow will import with 26 nodes in two parallel flows

### 2.2 Set Variables (n8n Variables, not credentials)
Go to **Settings → Variables** and add:

| Variable Name        | Value                          |
|----------------------|-------------------------------|
| `VAPI_API_KEY`       | Your VAPI API key              |
| `VAPI_ASSISTANT_ID`  | The assistant ID from Step 1.3 |
| `VAPI_PHONE_NUMBER_ID` | The phone number ID from Step 1.2 |

### 2.3 Connect PostgreSQL Credential
1. Open any Postgres node in the workflow
2. Click **Credentials → Create New**
3. Enter your Supabase/Postgres connection details (same DB your CRM uses)
4. Test the connection
5. All Postgres nodes share the same credential — set it once on any node, then select it on all others

### 2.4 Activate Both Webhooks
1. Click the **Lead Form Webhook** node → copy the Production URL
2. Click the **VAPI End-of-Call Webhook** node → copy the Production URL
3. Go back to VAPI and paste the end-of-call URL into the Server URL field (Step 1.4)
4. **Activate the workflow** (toggle at the top right)

---

## STEP 3 — Testing with the Dummy Form

Before connecting to live Meta Ads, test the entire flow using a direct POST request.

### 3.1 Test Payload (Individual Listing)
```json
{
  "ad_type": "listing",
  "entity_uuid": "YOUR-ACTUAL-LISTING-UUID-FROM-DB",
  "lead_name": "Ahmed Al-Rashidi",
  "phone": "+966501234567",
  "country": "SA",
  "email": "ahmed@test.com"
}
```

### 3.2 Test Payload (Project / Compound)
```json
{
  "ad_type": "project",
  "entity_uuid": "YOUR-ACTUAL-PROJECT-UUID-FROM-DB",
  "lead_name": "Mohammed Al-Ghamdi",
  "phone": "+966509876543",
  "country": "SA",
  "email": "mohammed@test.com"
}
```

### 3.3 How to send the test
Use Postman, cURL, or a simple HTML form:
```bash
curl -X POST https://your-n8n.com/webhook/vapi-meta-lead \
  -H "Content-Type: application/json" \
  -d '{"ad_type":"listing","entity_uuid":"YOUR-UUID","lead_name":"Test Lead","phone":"+966501234567","country":"SA"}'
```

### 3.4 What to verify after the test
1. Check n8n execution log — all nodes should pass green
2. Check your phone — you should receive the call within 30 seconds
3. Check your CRM Campaign Leads — a new lead should appear with status `CONTACTED`
4. After the call ends, check the CRM lead again — status should update to the correct outcome
5. Check the CRM Notes on that lead — VAPI call summary should appear

---

## STEP 4 — Connecting to Meta Ads (Live)

### 4.1 Add hidden field to your Meta Lead Form
In Meta Business Manager when creating a lead form:
1. Go to **Lead Forms → Create Form → Questions**
2. Add a **Hidden Field** (under Custom Questions)
3. Field 1 name: `ad_type` — value: `listing` or `project`
4. Field 2 name: `entity_uuid` — value: paste the UUID of the specific listing or project
5. Add `country` hidden field with value `SA` (or the relevant country code)

> This means each ad campaign must have its own lead form with the correct UUID. Your CEO creates one form per property they are advertising.

### 4.2 Update your existing Meta webhook
Your CRM already receives Meta leads at:
`https://saudi-real-estate-api.vercel.app/api/v1/crm/webhooks/meta`

You have two options:

**Option A (Recommended): Forward from existing webhook to n8n**
Modify your existing `POST /crm/webhooks/meta` handler to also POST to n8n after saving the lead:
```typescript
// After the existing lead is created in your CRM route:
if (fields['ad_type'] && fields['entity_uuid']) {
  fetch('https://your-n8n.com/webhook/vapi-meta-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ad_type:     fields['ad_type'],
      entity_uuid: fields['entity_uuid'],
      lead_name:   name,
      phone:       phone,
      country:     fields['country'] || 'SA',
      email:       email || ''
    })
  }).catch(err => app.log.error(err, 'VAPI trigger failed'));
}
```

**Option B: Set up a second Meta webhook subscription in n8n**
Add a separate webhook in n8n that subscribes to the same Meta page events.

Option A is simpler and keeps your existing CRM flow intact.

---

## STEP 5 — Handling Retries (No Answer)

The workflow automatically handles this:

- **Attempt 1**: Immediately when lead submits
- **Attempt 2**: 2 hours later (a `crm_followups` row is created with the scheduled time)
- **Attempt 3**: 24 hours later

For Attempts 2 and 3, you need to set up a **scheduled trigger** in n8n that checks for pending retries:

1. Create a new workflow: **Cron → every 15 minutes**
2. Query: `SELECT * FROM crm_followups WHERE is_completed = false AND scheduled_at <= NOW() AND note LIKE '%VAPI auto-retry%'`
3. For each row found, POST to your `vapi-meta-lead` webhook with `retry_count` and `crm_lead_id` included in the body

This closes the retry loop automatically.

---

## STEP 6 — Cost Optimisation Tips

| Setting | Recommendation | Why |
|---|---|---|
| Model | `gpt-4o-mini` | 10x cheaper than GPT-4, quality is sufficient for qualification calls |
| Voice | ElevenLabs `Rachel` | Good quality at standard tier; avoid Turbo voices (lower quality) |
| Max Duration | 360 seconds | Prevents runaway calls if lead leaves phone on; average call is 90–180s |
| Silence Timeout | 30 seconds | Ends call if lead stops responding, saves cost |
| Retry limit | 2 retries max | 3 total attempts is industry standard; more attempts = diminishing returns |
| Call hours | 9am–9pm only | Avoid early morning/late night; answer rates are much higher 10am–7pm |

**Estimated cost per lead (Saudi market):**
- Average call duration: ~2 minutes
- VAPI cost: ~$0.20 per call
- 3 attempts max: ~$0.60 per lead worst case
- Typical Meta lead cost in Saudi RE: SAR 50–200
- The voice qualification cost is less than 1% of lead acquisition cost

---

## STEP 7 — What Each CRM Status Means After a VAPI Call

| Status in CRM | What happened |
|---|---|
| `CONTACTED` | Call initiated, awaiting result |
| `QUALIFIED` | Lead answered, confirmed interest, budget aligns — assign to agent immediately |
| `FOLLOW_UP` | Callback needed or unknown outcome — agent should call manually |
| `CLOSED_LOST` (score 2) | Budget mismatch — keep for future campaigns at lower price point |
| `CLOSED_LOST` (score 1) | Not interested or 3 unanswered calls — archive |
| `NEW` (with followup) | No answer — auto-retry scheduled |

---

## Summary: What to Tell Your CEO

> "When someone fills out any of our Meta property ads, our system automatically calls them back within 30 seconds using an AI voice agent named Sara. Sara qualifies the lead — budget, purpose, timeline — and only the people who are genuinely interested in that specific property land in our CRM as qualified leads. Cold leads and uninterested people are automatically closed. Each call costs about 20 cents. Qualified leads are ready for your agents to follow up immediately with full call notes."

---

## Checklist Before Going Live

- [ ] VAPI account funded and phone number purchased
- [ ] Assistant `Sara` created with correct settings
- [ ] End-of-call webhook URL set in VAPI pointing to n8n
- [ ] n8n workflow imported and variables set (`VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`)
- [ ] Postgres credential connected and tested in n8n
- [ ] Workflow activated (not just saved)
- [ ] Dummy form test completed — call received and CRM updated
- [ ] Meta lead form hidden fields (`ad_type`, `entity_uuid`, `country`) added per campaign
- [ ] Existing Meta webhook forwarding to n8n (Option A above)
- [ ] Retry scheduler workflow set up
