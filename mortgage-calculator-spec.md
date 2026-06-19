# Mortgage Calculator — Complete Build Spec

**Read this entire document before writing any code.** Every number, rule, table, and
endpoint needed is already defined below — this is reverse-engineered and verified
against a live reference implementation (Bayut.sa's mortgage calculator), not a rough
guess. Do not search the web for "how mortgage calculators work" or invent your own
formula — use the exact formula in Section 3, and confirm it against the test cases in
Section 9 before moving on to UI work.

**Current state: nothing is built yet.** No API, no frontend, no database table. This
spec covers all three.

Stack: Next.js (frontend, already has a project details page this feature attaches to)
+ Fastify (backend, existing service) + existing admin panel (new table + new section
needed, not a new admin panel).

---

## 1. What this feature is

A mortgage/loan calculator widget that lives on the property details page. The user
adjusts price, down payment, and loan period; picks a bank; sees a live payment
breakdown; and can submit a lead form. That lead gets stored as a **Mortgage Lead** in
the existing admin panel, in a new section, exportable by the ops team — because we
have no direct bank integration. Submitted leads are manually handed by the business
owner to his personal bank contacts. The numbers shown to the user are a **good-faith
estimate**, not a binding quote (this is also why the UI shows a disclaimer — see
Section 8).

---

## 2. Nationality & down payment rules

```js
function getMinDownPaymentPct({ isCitizen, isFirstHome }) {
  if (isCitizen && isFirstHome) return 10; // Saudi citizen, first home purchase
  return 30; // Saudi citizen but NOT first home, OR non-Saudi (any case)
}
```

UI consequence — **this is not optional, it's a confirmed behavior from the reference
UI**:
- When the user selects **"I'm a Non-Saudi"**, the **"Is this your first home?" toggle
  must be completely removed from the DOM**, not just disabled/grayed out. Down payment
  locks to 30% immediately.
- When the user selects **"I'm a Saudi"**, the first-home toggle appears, defaulted to
  "Yes" → 10% down payment. Switching it to "No" changes minimum down payment to 30%.
- Down payment is a slider + numeric input, with the minimum down payment % above as the
  *minimum* the slider can go to (i.e. minimum down payment in currency = price × min%).
  Maximum down payment can be capped at 90% of price (user should always be financing at
  least 10% via loan, otherwise the calculator is meaningless) — set
  `maxDownPaymentPct = 90` as a config constant.

---

## 3. Verified calculation formula

This exact formula was reverse-engineered from Bayut.sa's production JS bundle and
independently verified against 5 screenshots, producing exact riyal-for-riyal matches
(see Section 9 for the test cases — run these as unit tests before building any UI).

```js
/**
 * @param {number} price - total property price (SAR)
 * @param {number} downPaymentAmount - down payment in SAR (not %)
 * @param {number} loanPeriodYears - integer, 5-25
 * @param {number} annualRatePct - e.g. 3.80 for 3.80%
 */
function calculateMortgage({ price, downPaymentAmount, loanPeriodYears, annualRatePct }) {
  const loanAmount = price - downPaymentAmount;

  // NOTE: this scaling (×100 then /10000) is exactly how the reference implementation
  // does it. Do not "simplify" this to annualRatePct/100 — it will produce the wrong
  // number due to how the reference's interest rate units work. Keep it as-is.
  const interestRateUnits = annualRatePct * 100; // e.g. 3.80 -> 380

  const totalPayableValue = loanAmount + (interestRateUnits / 10000) * loanAmount * loanPeriodYears;
  const monthlyInstalment = totalPayableValue / (12 * loanPeriodYears);
  const bankProfitPercentage = 100 - (100 * loanAmount) / totalPayableValue;

  return {
    downPaymentAmount,
    totalLoanAmount: loanAmount,
    totalPayableValue,           // = principal + total bank profit over the full term
    monthlyInstalment,
    bankProfitPercentage,        // feeds the donut chart: bank profit % vs principal %
  };
}
```

**Rounding rule:** never round intermediate values. Only round the final output fields
for display, using `Math.round()`. The test cases in Section 9 are post-rounding values.

**Rate lookup:**

```js
function getRateForBank(bank, loanPeriodYears) {
  const entry = bank.interestDetails?.find(d => d.years === loanPeriodYears);
  if (entry) return entry.rate * 100; // stored as decimal (0.038) -> convert to % (3.80)
  return FALLBACK_RATE_PCT; // = 4.30, see Section 4
}
```

Every bank in Section 6 has a rate defined for every integer year from 5 to 25 — so in
practice `entry` will always be found except for banks with `interestDetails: null`
(currently only Riyad Bank — see Section 6).

---

## 4. Fallback rate (locked-in values)

```js
const FALLBACK_RATE_PCT = 4.30; // flat rate, all loan periods, for banks with no data
const MAX_PRICE_BUFFER_PCT = 15; // see Section 5
```

Use this flat 4.30% for **any** bank where `interestDetails` is `null` or missing a rate
for the selected year. Do not use the cheapest available rate as a fallback — it would
make an unverified bank look like the best deal on the page, which creates a
bait-and-switch problem once the owner's actual bank contact returns a real quote.

---

## 5. Price cap (with buffer)

```js
function getMaxPrice(propertyPrice) {
  return Math.round(propertyPrice * (1 + MAX_PRICE_BUFFER_PCT / 100)); // 15% buffer
}
```

**Clamping behavior** (matches reference exactly — implement it this way):
- The price slider + numeric input share state. The slider's `max` = `getMaxPrice(propertyPrice)`.
- While the user is actively typing in the numeric input, do NOT clamp on every
  keystroke — let them type freely (e.g. typing "5" then "9" then "8000" should not get
  interrupted).
- Clamp only on **blur** or **Enter key**: if the value is above max, snap to max; if
  below 0 or non-numeric, snap back to the last valid value.
- Whenever `price` changes (via slider drag, or input blur), recalculate the down
  payment slider's min/max (since min/max down payment are percentages of price) and
  re-clamp the current down payment value into the new valid range if needed.

---

## 6. Bank dataset (use exactly as-is — do not invent or omit banks)

10 banks total. Display as a horizontal scrollable row of selectable tiles, single-select
(radio-button behavior, one active bank at a time). **No logo images** — render each
tile as a styled box containing the bank's name as bold text (this is what the reference
UI actually does for most banks; e.g. "BSF", "FAB", "SNB" are text, not images). Keep
this as a static JSON/seed file or DB table — do not hardcode it inline in the
calculation function.

```json
[
  { "slug": "emirates-nbd", "externalId": "1", "nameEn": "Emirates NBD", "nameAr": "Emirates NBD" },
  { "slug": "bsf", "externalId": "10", "nameEn": "BSF", "nameAr": "BSF" },
  { "slug": "al-jazira", "externalId": "2", "nameEn": "Al Jazira", "nameAr": "Al Jazira" },
  { "slug": "fab", "externalId": "3", "nameEn": "FAB", "nameAr": "FAB" },
  { "slug": "al-rajhi", "externalId": "4", "nameEn": "Al Rajhi", "nameAr": "Al Rajhi" },
  { "slug": "snb", "externalId": "5", "nameEn": "SNB", "nameAr": "SNB" },
  { "slug": "riyad-bank", "externalId": "6", "nameEn": "Riyad Bank", "nameAr": "Riyad Bank" },
  { "slug": "shl", "externalId": "7", "nameEn": "SHL", "nameAr": "SHL" },
  { "slug": "sab", "externalId": "8", "nameEn": "SAB", "nameAr": "SAB" },
  { "slug": "dar-al-tamleek", "externalId": "9", "nameEn": "Dar Al Tamleek", "nameAr": "Dar Al Tamleek" }
]
```

### Full interest rate tables (annual %, by loan period in years)

#### Emirates NBD
`slug: "emirates-nbd"` · `externalId: "1"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.45% |
| 6 | 3.65% |
| 7 | 3.65% |
| 8 | 3.65% |
| 9 | 3.65% |
| 10 | 3.65% |
| 11 | 3.80% |
| 12 | 3.80% |
| 13 | 3.80% |
| 14 | 3.80% |
| 15 | 3.80% |
| 16 | 3.95% |
| 17 | 3.95% |
| 18 | 3.95% |
| 19 | 3.95% |
| 20 | 3.95% |
| 21 | 4.10% |
| 22 | 4.10% |
| 23 | 4.10% |
| 24 | 4.10% |
| 25 | 4.10% |

#### BSF
`slug: "bsf"` · `externalId: "10"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.60% |
| 6 | 3.60% |
| 7 | 3.60% |
| 8 | 3.60% |
| 9 | 3.60% |
| 10 | 3.65% |
| 11 | 3.65% |
| 12 | 3.70% |
| 13 | 3.75% |
| 14 | 3.80% |
| 15 | 3.85% |
| 16 | 3.90% |
| 17 | 3.95% |
| 18 | 4.00% |
| 19 | 4.05% |
| 20 | 4.10% |
| 21 | 4.15% |
| 22 | 4.20% |
| 23 | 4.25% |
| 24 | 4.30% |
| 25 | 4.35% |

#### Al Jazira
`slug: "al-jazira"` · `externalId: "2"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.46% |
| 6 | 3.46% |
| 7 | 3.46% |
| 8 | 3.46% |
| 9 | 3.46% |
| 10 | 3.55% |
| 11 | 3.60% |
| 12 | 3.65% |
| 13 | 3.70% |
| 14 | 3.75% |
| 15 | 3.80% |
| 16 | 3.85% |
| 17 | 3.90% |
| 18 | 4.00% |
| 19 | 4.05% |
| 20 | 4.07% |
| 21 | 4.13% |
| 22 | 4.16% |
| 23 | 4.20% |
| 24 | 4.24% |
| 25 | 4.26% |

#### FAB
`slug: "fab"` · `externalId: "3"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.85% |
| 6 | 4.08% |
| 7 | 4.08% |
| 8 | 4.08% |
| 9 | 4.08% |
| 10 | 4.08% |
| 11 | 4.20% |
| 12 | 4.20% |
| 13 | 4.20% |
| 14 | 4.20% |
| 15 | 4.20% |
| 16 | 4.00% |
| 17 | 4.41% |
| 18 | 4.41% |
| 19 | 4.41% |
| 20 | 4.41% |
| 21 | 4.58% |
| 22 | 4.58% |
| 23 | 4.58% |
| 24 | 4.58% |
| 25 | 4.58% |

#### Al Rajhi
`slug: "al-rajhi"` · `externalId: "4"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.89% |
| 6 | 4.09% |
| 7 | 4.09% |
| 8 | 4.09% |
| 9 | 4.09% |
| 10 | 3.94% |
| 11 | 3.99% |
| 12 | 4.04% |
| 13 | 4.09% |
| 14 | 4.14% |
| 15 | 4.19% |
| 16 | 4.24% |
| 17 | 4.29% |
| 18 | 4.34% |
| 19 | 4.39% |
| 20 | 4.44% |
| 21 | 4.54% |
| 22 | 4.59% |
| 23 | 4.63% |
| 24 | 4.69% |
| 25 | 4.74% |

#### SNB
`slug: "snb"` · `externalId: "5"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.83% |
| 6 | 3.85% |
| 7 | 3.89% |
| 8 | 3.92% |
| 9 | 3.95% |
| 10 | 3.99% |
| 11 | 4.04% |
| 12 | 4.09% |
| 13 | 4.15% |
| 14 | 4.20% |
| 15 | 4.26% |
| 16 | 4.32% |
| 17 | 4.38% |
| 18 | 4.44% |
| 19 | 4.50% |
| 20 | 4.56% |
| 21 | 4.63% |
| 22 | 4.69% |
| 23 | 4.75% |
| 24 | 4.82% |
| 25 | 4.87% |

#### Riyad Bank
`slug: "riyad-bank"` · `externalId: "6"`

No rate data from source. **Use the flat fallback rate of 4.30% for every loan period
(5-25 years).**

#### SHL
`slug: "shl"` · `externalId: "7"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 5.50% |
| 6 | 5.56% |
| 7 | 5.64% |
| 8 | 5.71% |
| 9 | 5.78% |
| 10 | 5.86% |
| 11 | 5.93% |
| 12 | 6.01% |
| 13 | 6.08% |
| 14 | 6.16% |
| 15 | 6.23% |
| 16 | 6.30% |
| 17 | 6.37% |
| 18 | 6.44% |
| 19 | 6.51% |
| 20 | 6.58% |
| 21 | 6.65% |
| 22 | 6.71% |
| 23 | 6.78% |
| 24 | 6.84% |
| 25 | 6.96% |

#### SAB
`slug: "sab"` · `externalId: "8"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 3.15% |
| 6 | 3.15% |
| 7 | 3.15% |
| 8 | 3.15% |
| 9 | 3.15% |
| 10 | 3.45% |
| 11 | 3.45% |
| 12 | 3.55% |
| 13 | 3.55% |
| 14 | 3.60% |
| 15 | 3.60% |
| 16 | 3.65% |
| 17 | 3.65% |
| 18 | 3.75% |
| 19 | 3.75% |
| 20 | 3.79% |
| 21 | 3.95% |
| 22 | 3.98% |
| 23 | 4.01% |
| 24 | 4.04% |
| 25 | 4.06% |

#### Dar Al Tamleek
`slug: "dar-al-tamleek"` · `externalId: "9"`

| Loan Period (years) | Annual Rate |
|---|---|
| 5 | 5.20% |
| 6 | 5.20% |
| 7 | 5.20% |
| 8 | 5.39% |
| 9 | 5.46% |
| 10 | 5.53% |
| 11 | 5.53% |
| 12 | 5.53% |
| 13 | 5.53% |
| 14 | 5.53% |
| 15 | 5.86% |
| 16 | 5.86% |
| 17 | 5.86% |
| 18 | 5.86% |
| 19 | 5.86% |
| 20 | 6.19% |
| 21 | 6.19% |
| 22 | 6.19% |
| 23 | 6.19% |
| 24 | 6.19% |
| 25 | 6.19% |

---

## 7. Backend: database schema, API contract

### 7.1 New tables (use your existing DB/ORM conventions — this is the shape, not exact DDL)

**`mortgage_banks`** (seed once, editable later without redeploy)
| column | type | notes |
|---|---|---|
| id | pk | |
| slug | string, unique | e.g. `emirates-nbd` |
| external_id | string | from Section 6 |
| name_en | string | |
| name_ar | string | |
| is_active | boolean, default true | lets you hide a bank without deleting its rate history |

**`mortgage_bank_rates`**
| column | type | notes |
|---|---|---|
| id | pk | |
| bank_id | fk -> mortgage_banks.id | |
| loan_period_years | integer | 5-25 |
| annual_rate_pct | decimal | e.g. 3.80 |

Unique constraint on `(bank_id, loan_period_years)`.

**`mortgage_leads`** (this is the new admin panel table — see Section 8)
| column | type | notes |
|---|---|---|
| id | pk | |
| full_name | string | |
| phone_number | string | include country code, e.g. +966... |
| monthly_income | decimal, nullable | optional field |
| redf_supported | boolean, nullable | "REDF Supported" Yes/No toggle from the lead form |
| monthly_obligations | decimal, nullable | optional field |
| property_external_id | string | which property this lead came from |
| property_price | decimal | snapshot at time of submission |
| is_citizen | boolean | |
| is_first_home | boolean, nullable | null when non-Saudi (field doesn't apply) |
| down_payment_amount | decimal | snapshot |
| loan_period_years | integer | snapshot |
| bank_slug | string | snapshot |
| bank_name_en | string | snapshot — store the name even if bank record changes later |
| applied_rate_pct | decimal | snapshot — the rate actually used in the calc shown to the user |
| monthly_instalment | decimal | snapshot of the calculated result shown to the user |
| total_payable_value | decimal | snapshot |
| total_loan_amount | decimal | snapshot |
| status | enum/string | e.g. `new`, `contacted`, `closed` — for admin workflow |
| created_at | timestamp | |

**Critical: store the full calculation snapshot, not just the inputs.** If you only
store inputs and recompute later, a future rate/config change will silently change what
the lead "said" historically, which is exactly the kind of inconsistency that causes
disputes with bank partners. The admin panel must show what the user actually saw on
screen.

### 7.2 API endpoints (Fastify)

```
GET  /api/mortgage/banks
  → Returns active banks with their rate tables.
  Response: [
    {
      slug, externalId, nameEn, nameAr,
      interestDetails: [{ years, ratePct }, ...] | null
    }
  ]

GET  /api/mortgage/config
  → Returns the constants needed by the frontend to build the form (NOT the formula
    itself — formula stays backend-only).
  Response: {
    minDownPaymentPctFirstHomeCitizen: 10,
    minDownPaymentPctDefault: 30,
    maxDownPaymentPct: 90,
    minLoanPeriodYears: 5,
    maxLoanPeriodYears: 25,
    defaultLoanPeriodYears: 15,
    maxPriceBufferPct: 15
  }

POST /api/mortgage/calculate
  Body: {
    propertyExternalId: string,
    price: number,
    isCitizen: boolean,
    isFirstHome: boolean | null,   // null/omitted when isCitizen is false
    downPaymentAmount: number,
    loanPeriodYears: number,
    bankSlug: string
  }
  Response: {
    totalLoanAmount: number,
    totalPayableValue: number,
    monthlyInstalment: number,
    bankProfitPercentage: number,
    downPaymentAmount: number,
    appliedRatePct: number
  }
  Server-side validation (reject with 400 if violated):
    - downPaymentAmount >= price * getMinDownPaymentPct(...) / 100
    - downPaymentAmount <= price * maxDownPaymentPct / 100
    - loanPeriodYears between minLoanPeriodYears and maxLoanPeriodYears
    - price <= getMaxPrice(propertyPrice) — fetch the real property price server-side
      by propertyExternalId, do not trust a client-sent "max" value
    - bankSlug exists and is_active

POST /api/mortgage/leads
  Body: {
    fullName: string,             // required
    phoneNumber: string,          // required, must include country code
    monthlyIncome: number | null,
    redfSupported: boolean | null,
    monthlyObligations: number | null,
    propertyExternalId: string,
    price: number,
    isCitizen: boolean,
    isFirstHome: boolean | null,
    downPaymentAmount: number,
    loanPeriodYears: number,
    bankSlug: string
  }
  → Server re-runs calculateMortgage() with these exact inputs (don't trust a
    client-sent result), stores the full snapshot per Section 7.1, returns the
    created lead id.
  Response: { id, status: "new", createdAt }
```

**Frontend must call `/api/mortgage/calculate` on every input change** (debounce
~200ms), not replicate the formula in JS. This guarantees the number a user sees always
matches what gets stored against the lead, and lets you change rates/formula without a
client release — this was the original reason for putting this in the backend at all.

---

## 8. Lead submission modal (UI exact spec)

Matches the reference screenshot exactly. Build this as a modal triggered by a "Submit
request" button below the payment breakdown panel.

Fields, top to bottom:
1. **Full Name*** — text input, placeholder "Enter your full name", required
2. **Phone Number*** — phone input with country code selector defaulted to `+966`
   (Saudi flag), required, validate as a real phone number
3. **Monthly Income** — text/number input, placeholder "Enter your monthly income",
   optional
4. **REDF Supported** — two-button toggle, "Yes" / "No", defaults to "Yes" selected
   (teal outline + teal text when active, gray/neutral when inactive) — REDF here means
   Real Estate Development Fund support, a yes/no the user self-declares
5. **Monthly Obligations** — text/number input, placeholder "Enter your monthly
   obligations", optional
6. **Submit request** button — full width, dark teal background (`#006169` matches the
   reference brand color), white bold text
7. Below the button: small gray disclaimer text — "By clicking the 'Submit Request'
   button you are agreeing to [Your Company]'s **Terms & Conditions**" with the Terms
   & Conditions part as a teal link

On submit: validate required fields client-side, POST to `/api/mortgage/leads` with the
current calculator state (price, down payment, loan period, bank, citizen/first-home
flags) merged with the form fields. On success, close modal and show a confirmation
toast/state. On failure, show an inline error, don't lose the user's typed input.

---

## 9. Verified test cases — run these first

Implement `calculateMortgage()` and `getRateForBank()`, then run these 5 cases as unit
tests before touching any UI. All five must match exactly (to the riyal). These were
independently verified against 5 separate reference screenshots.

| # | Bank | Price | Down Payment | Down % | Years | Rate | Total Payable | Monthly Instalment |
|---|---|---|---|---|---|---|---|---|
| 1 | Emirates NBD | 460,000 | 46,000 | 10% | 15 | 3.80% | **649,980** | **3,611** |
| 2 | BSF | 460,000 | 46,000 | 10% | 15 | 3.85% | **653,085** | **3,628** |
| 3 | Al Rajhi | 460,000 | 138,000 | 30% | 15 | 4.19% | **524,377** | **2,913** |
| 4 | SNB | 460,000 | 138,000 | 30% | 15 | 4.26% | **527,758** | **2,932** |
| 5 | SHL | 460,000 | 46,000 | 10% | 15 | 6.23% | **800,883** | **4,449** |

If any of these don't match: the bug is almost certainly either (a) an off-by-one in
the rate-bracket lookup for the given `years`, or (b) the `annualRatePct * 100` scaling
step in `interestRateUnits` being altered/"simplified" away. Do not change the formula
shape to make a test pass — re-check the rate lookup first.

---

## 10. Frontend components (Next.js)

Build as a self-contained feature folder, e.g. `components/mortgage-calculator/`.

- **`MortgageCalculator`** (container) — owns form state (price, downPayment,
  loanPeriodYears, isCitizen, isFirstHome, selectedBankSlug), fetches `/config` and
  `/banks` on mount, debounced call to `/calculate` on any input change, renders child
  components below.
- **`NationalityToggle`** — "I'm a Saudi" / "I'm a Non-Saudi" pill toggle.
- **`FirstHomeToggle`** — "Is this your first home?" Yes/No pill toggle. **Conditionally
  rendered only when `isCitizen === true`.** Unmount entirely (not just hide via CSS)
  when non-Saudi is selected, and reset `isFirstHome` to `null` in that case.
- **`BankSelector`** — horizontal scrollable row of bank tiles (text-only, bank name
  bold, bordered box, active state = teal border + light teal background). Single-select.
  Mouse-drag-to-scroll on desktop (reference implementation supports this — click and
  drag the row to scroll), plus normal touch scroll on mobile.
- **`PriceSlider`** — slider + numeric input pair, linked, range `[0, getMaxPrice(propertyPrice)]`.
- **`DownPaymentSlider`** — slider + numeric input pair, range derived from
  `getMinDownPaymentPct(...)` and `maxDownPaymentPct`, both as % of current `price`.
  Shows a live percentage badge next to the input (e.g. "10%").
- **`LoanPeriodSlider`** — slider + numeric input pair, range
  `[minLoanPeriodYears, maxLoanPeriodYears]` from config, unit label "Years".
- **`PaymentBreakdownPanel`** — donut/ring chart showing `bankProfitPercentage` vs
  `100 - bankProfitPercentage` (principal), center label "Total Payable" + the SAR
  amount, legend with two color swatches ("Bank Profit" dark teal, "Principal" light
  teal/gray), below it "Monthly Installment" and "Total Loan Amount" as labeled stat
  rows.
- **`SubmitRequestButton`** + **`LeadSubmissionModal`** — per Section 8.

**Slider+input linking pattern** (apply consistently across all three sliders): the
numeric input is the source of truth while it has focus; the slider updates the shared
state on drag; both go through the same clamp/validate function on blur. This is what
makes dragging the slider and typing in the box never disagree with each other —
implement this as one reusable hook (e.g. `useLinkedSliderInput`) shared by all three
sliders rather than three separate implementations.

**Currency display:** the reference UI shows a Saudi Riyal symbol icon before/after
amounts. Use whatever currency-formatting utility already exists in the codebase for
other SAR amounts on the property pages — don't introduce a second formatting
convention.

---

## 11. Admin panel — new section

This is an addition to the **existing** admin panel, not a new admin panel.

- Add a new sidebar/nav item: **"Mortgage Leads"**.
- List view: paginated table of `mortgage_leads`, sortable by `created_at`, with
  columns: Name, Phone, Property, Bank, Monthly Installment, Down Payment %, Status,
  Date.
- Detail view (click a row): show the full snapshot — every field in the
  `mortgage_leads` table from Section 7.1, including the full calculation breakdown as
  it was shown to the user at submission time.
- **Export**: a button to export the current filtered/sorted list as CSV (or XLSX if
  that's the existing convention elsewhere in the admin panel — match whatever pattern
  already exists for other lead exports rather than introducing a new one).
- **Status update**: allow changing `status` (`new` / `contacted` / `closed`) inline
  from the list or detail view, since the owner will be manually working these leads
  with his bank contacts.
- Filters: by bank, by status, by date range, by `is_citizen` — these are the fields the
  owner will most likely want to filter on when handing batches of leads to different
  bank contacts.

---

## 12. Build order (suggested, to avoid wasted rework)

1. DB migrations for the 3 tables (Section 7.1), seed `mortgage_banks` +
   `mortgage_bank_rates` from Section 6's data.
2. Backend `calculateMortgage()` + `getRateForBank()` — write as pure functions, unit
   test against Section 9's 5 cases before continuing.
3. `GET /api/mortgage/banks`, `GET /api/mortgage/config`, `POST /api/mortgage/calculate`
   — wire up, confirm with a manual Postman/curl test using the Section 9 inputs that
   the API returns the same numbers.
4. `POST /api/mortgage/leads` — wire up with server-side recompute + snapshot storage.
5. Admin panel: new table view + detail view + export + status update (Section 11).
6. Frontend: build `MortgageCalculator` and children (Section 10), wire to the 3 GET/POST
   endpoints, no formula logic in the frontend at all.
7. Lead modal (Section 8), wire to `/api/mortgage/leads`.
8. End-to-end test: walk through all 5 Section 9 cases manually in the actual UI, confirm
   numbers match exactly, then test the non-Saudi flow (toggle hidden, 30% locked), then
   test a bank with no rate data (Riyad Bank, should show 4.30% flat).
