# Mobile API Implementation Guide
## Mortgage & Listing Report Endpoints

---

## Overview

This document explains how we implemented the **Mortgage Calculator** and **Property Report** endpoints for the web application. These features allow users to calculate mortgage payments and report problematic listings.

---

## Table of Contents
1. [Mortgage Endpoints](#mortgage-endpoints)
2. [Report Endpoints](#report-endpoints)
3. [Similar Properties Endpoint](#similar-properties-endpoint)

---

# MORTGAGE ENDPOINTS

## 1. GET /api/v1/mortgage/banks
**Get list of active banks with their interest rates**

### Purpose
Fetches all active mortgage banks and their interest rate tables organized by loan periods.

### Request
```bash
GET /api/v1/mortgage/banks
```

### Response Success (200)
```json
{
  "success": true,
  "data": [
    {
      "slug": "saudi-national-bank",
      "externalId": "SNB-001",
      "nameEn": "Saudi National Bank",
      "nameAr": "البنك الأهلي السعودي",
      "interestDetails": [
        {
          "years": 5,
          "ratePct": 3.50
        },
        {
          "years": 10,
          "ratePct": 3.75
        },
        {
          "years": 15,
          "ratePct": 3.80
        },
        {
          "years": 20,
          "ratePct": 4.00
        },
        {
          "years": 25,
          "ratePct": 4.30
        }
      ]
    },
    {
      "slug": "riad-bank",
      "externalId": "RIAD-001",
      "nameEn": "Riad Bank",
      "nameAr": "بنك الرياض",
      "interestDetails": [...]
    }
  ]
}
```

### Response Error (500)
```json
{
  "success": false,
  "message": "Failed to fetch mortgage banks"
}
```

### How It Works
1. Query all **active** mortgage banks from the database
2. For each bank, fetch its associated interest rate table (rates for different loan periods)
3. Format the response with bank information and sorted interest rates (by years)
4. Return rates sorted from shortest to longest loan period

### Mobile Implementation
```typescript
// Fetch banks when opening mortgage calculator
async function loadMortgageBanks() {
  const response = await fetch('/api/v1/mortgage/banks');
  const { data } = await response.json();
  
  // data is an array of banks with their rates
  // Use this to populate bank selection dropdown
  populateBankDropdown(data);
}
```

---

## 2. GET /api/v1/mortgage/config
**Get mortgage calculator configuration constants**

### Purpose
Returns fixed values that constrain and configure the mortgage calculator UI(minimum/maximum values, defaults, etc.).

### Request
```bash
GET /api/v1/mortgage/config
```

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "minDownPaymentPctFirstHomeCitizen": 10,
    "minDownPaymentPctDefault": 30,
    "maxDownPaymentPct": 90,
    "minLoanPeriodYears": 5,
    "maxLoanPeriodYears": 25,
    "defaultLoanPeriodYears": 15,
    "maxPriceBufferPct": 15
  }
}
```

### Configuration Explained
| Field | Value | Meaning |
|-------|-------|---------|
| `minDownPaymentPctFirstHomeCitizen` | 10% | Saudi citizens buying their first home need only 10% down payment |
| `minDownPaymentPctDefault` | 30% | Non-citizens or repeat buyers need minimum 30% down payment |
| `maxDownPaymentPct` | 90% | Maximum down payment is 90% of property price |
| `minLoanPeriodYears` | 5 | Minimum loan period is 5 years |
| `maxLoanPeriodYears` | 25 | Maximum loan period is 25 years |
| `defaultLoanPeriodYears` | 15 | Pre-select 15 years as default loan period |
| `maxPriceBufferPct` | 15% | Allow prices up to 15% above listed property price |

### Mobile Implementation
```typescript
// Cache these values when app starts
const mortgageConfig = await fetch('/api/v1/mortgage/config').then(r => r.json());

// Use to set validation rules
minDownPayment = isCitizen && isFirstHome 
  ? config.minDownPaymentPctFirstHomeCitizen 
  : config.minDownPaymentPctDefault;
```

---

## 3. POST /api/v1/mortgage/calculate
**Calculate mortgage payment breakdown**

### Purpose
Server-side calculation of mortgage values. The mobile app sends the user's input, and the backend verifies all constraints and computes the exact payment breakdown.

### Request
```bash
POST /api/v1/mortgage/calculate
Content-Type: application/json

{
  "propertyExternalId": "PROP-12345",
  "price": 500000,
  "isCitizen": true,
  "isFirstHome": true,
  "downPaymentAmount": 50000,
  "loanPeriodYears": 15,
  "bankSlug": "saudi-national-bank"
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `propertyExternalId` | string | ✓ | Property ID or shortId from listings/projects |
| `price` | number | ✓ | Property price in SAR |
| `isCitizen` | boolean | ✓ | Is buyer a Saudi citizen? |
| `isFirstHome` | boolean | ✗ | Is this their first home purchase? (affects down payment %) |
| `downPaymentAmount` | number | ✓ | Down payment amount in SAR |
| `loanPeriodYears` | number | ✓ | Loan period (5-25 years) |
| `bankSlug` | string | ✓ | Bank identifier (e.g., "saudi-national-bank") |

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "totalLoanAmount": 450000,
    "totalPayableValue": 562500,
    "monthlyInstalment": 3125,
    "bankProfitPercentage": 19.95,
    "downPaymentAmount": 50000,
    "appliedRatePct": 3.8
  }
}
```

### Response Fields Explained
| Field | Example | Formula / Meaning |
|-------|---------|------------------|
| `totalLoanAmount` | 450000 | Price - Down Payment |
| `downPaymentAmount` | 50000 | User's down payment |
| `appliedRatePct` | 3.8 | Interest rate (%) from bank's rate table |
| `totalPayableValue` | 562500 | Loan + Interest calculated over loan period |
| `monthlyInstalment` | 3125 | Total Payable / (12 × Years) |
| `bankProfitPercentage` | 19.95 | How much bank profits as % of total payment |

### Mortgage Calculation Formula
```
loanAmount = price - downPayment
interestRateUnits = annualRatePct * 100  (e.g., 3.8 → 380)

totalPayableValue = loanAmount + (interestRateUnits / 10000) × loanAmount × loanPeriodYears
monthlyInstalment = totalPayableValue / (12 × loanPeriodYears)
bankProfitPercentage = 100 - (100 × loanAmount / totalPayableValue)
```

**Example Calculation:**
```
Property Price: 500,000 SAR
Down Payment: 50,000 SAR (10%)
Loan Amount: 450,000 SAR
Interest Rate: 3.8% annually
Loan Period: 15 years

Interest Rate Units = 3.8 × 100 = 380
Total Payable = 450,000 + (380/10000) × 450,000 × 15
              = 450,000 + 0.038 × 450,000 × 15
              = 450,000 + 256,500
              = 706,500 SAR

Monthly Payment = 706,500 / (12 × 15)
                = 706,500 / 180
                = 3,925 SAR

Bank Profit % = 100 - (100 × 450,000 / 706,500)
              = 100 - 63.67
              = 36.33%
```

### Validation Rules (Server-Side)
The backend validates the following **before** calculating:

1. **Required Fields Check**
   - All fields must be provided

2. **Loan Period Validation**
   - Must be between 5 and 25 years

3. **Property Validation**
   - Property must exist (matched by ID or shortId)
   - Property must be in database (listing or project)

4. **Price Validation**
   - Submitted price must not exceed 15% above listed price
   - `maxAllowedPrice = listedPrice × 1.15`

5. **Down Payment Validation**
   - Minimum: 10% (if citizen + first home) or 30% (otherwise)
   - Maximum: 90% of price
   - `minDownPayment = price × minPercentage / 100`
   - `maxDownPayment = price × 0.90`

6. **Bank Validation**
   - Bank must exist and be active in database
   - Bank must have interest rate for requested loan period

### Response Errors

**400 - Validation Error**
```json
{
  "success": false,
  "message": "Required fields are missing."
}
```

**400 - Invalid Loan Period**
```json
{
  "success": false,
  "message": "Loan period must be between 5 and 25 years."
}
```

**404 - Property Not Found**
```json
{
  "success": false,
  "message": "Property or Project not found."
}
```

**400 - Price Exceeds Buffer**
```json
{
  "success": false,
  "message": "Price exceeds the maximum allowed buffer (575000 SAR)."
}
```

**400 - Invalid Down Payment**
```json
{
  "success": false,
  "message": "Down payment must be at least 10% of the price (50000 SAR)."
}
```

**400 - Invalid Bank**
```json
{
  "success": false,
  "message": "Selected bank is invalid or inactive."
}
```

**500 - Server Error**
```json
{
  "success": false,
  "message": "Calculation failed.",
  "error": "Error details..."
}
```

### Mobile Implementation
```typescript
async function calculateMortgage(formData) {
  try {
    const response = await fetch('/api/v1/mortgage/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      showError(error.message);
      return null;
    }
    
    const { data } = await response.json();
    displayCalculationResults(data);
  } catch (err) {
    showError('Network error. Please try again.');
  }
}
```

---

## 4. POST /api/v1/mortgage/leads
**Submit mortgage calculator lead**

### Purpose
Capture user's mortgage inquiry with their details and the calculation snapshot. The backend re-validates all data and stores it for follow-up by sales team.

### Request
```bash
POST /api/v1/mortgage/leads
Content-Type: application/json

{
  "fullName": "Ahmed Al-Otaibi",
  "phoneNumber": "+966501234567",
  "monthlyIncome": 15000,
  "redfSupported": true,
  "monthlyObligations": 2000,
  "propertyExternalId": "PROP-12345",
  "price": 500000,
  "isCitizen": true,
  "isFirstHome": true,
  "downPaymentAmount": 50000,
  "loanPeriodYears": 15,
  "bankSlug": "saudi-national-bank"
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fullName` | string | ✓ | Buyer's full name |
| `phoneNumber` | string | ✓ | Contact phone number |
| `monthlyIncome` | number | ✗ | Monthly income (optional, for qualification check) |
| `redfSupported` | boolean | ✗ | Is buyer REDF eligible? (default: true) |
| `monthlyObligations` | number | ✗ | Existing monthly debt obligations |
| `propertyExternalId` | string | ✓ | Property ID or shortId |
| `price` | number | ✓ | Property price in SAR |
| `isCitizen` | boolean | ✓ | Is buyer Saudi citizen? |
| `isFirstHome` | boolean | ✗ | First home purchase? |
| `downPaymentAmount` | number | ✓ | Down payment amount |
| `loanPeriodYears` | number | ✓ | Desired loan period (5-25) |
| `bankSlug` | string | ✓ | Bank identifier |

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "new",
    "createdAt": "2024-06-19T14:30:00Z"
  },
  "message": "Lead submitted successfully"
}
```

### Database Record Stored
When a lead is submitted, the following data is **permanently stored** in the database:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Ahmed Al-Otaibi",
  "phoneNumber": "+966501234567",
  "monthlyIncome": "15000.00",
  "redfSupported": true,
  "monthlyObligations": "2000.00",
  "propertyExternalId": "PROP-12345",
  "propertyPrice": "500000.00",
  "isCitizen": true,
  "isFirstHome": true,
  "downPaymentAmount": "50000.00",
  "loanPeriodYears": 15,
  "bankSlug": "saudi-national-bank",
  "bankNameEn": "Saudi National Bank",
  "appliedRatePct": "3.80",
  "monthlyInstalment": "3125.00",
  "totalPayableValue": "562500.00",
  "totalLoanAmount": "450000.00",
  "status": "new",
  "createdAt": "2024-06-19T14:30:00Z"
}
```

### Mobile Implementation
```typescript
async function submitMortgageLead(formData) {
  try {
    // First validate on client
    if (!formData.fullName || !formData.phoneNumber) {
      showError('Name and phone are required');
      return;
    }
    
    const response = await fetch('/api/v1/mortgage/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      showError(result.message);
      return;
    }
    
    // Success - show confirmation
    showSuccess(`Lead submitted! ID: ${result.data.id}`);
    navigateToThankYou();
  } catch (err) {
    showError('Failed to submit. Please try again.');
  }
}
```

---

# REPORT ENDPOINTS

## POST /api/v1/listings/:id/report
**Report a listing for violations or inaccuracies**

### Purpose
Allow users to report problematic listings (false information, policy violations, offensive content, etc.). Reports are stored for admin review and follow-up.

### Request
```bash
POST /api/v1/listings/PROP-12345/report
Content-Type: application/json

{
  "reason": "FRAUD_MISREPRESENTATION",
  "reporterName": "Ahmed Al-Otaibi",
  "reporterEmail": "ahmed@example.com",
  "description": "The listing shows 5 bedrooms but actually has 3. The photos are from a different property."
}
```

### Request Parameters
| Field | Location | Type | Required |
|-------|----------|------|----------|
| `id` | URL Path | string | ✓ |

### Request Body Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | ✓ | Category of violation (see table below) |
| `reporterName` | string | ✓ | Name of person reporting |
| `reporterEmail` | string | ✓ | Email for follow-up contact |
| `description` | string | ✗ | Detailed explanation of issue |

### URL Path Variants
The endpoint accepts the property identifier in multiple formats:

```bash
# Using full property ID
POST /api/v1/listings/550e8400-e29b-41d4-a716-446655440000/report

# Using short ID (e.g., "PROP-12345")
POST /api/v1/listings/PROP-12345/report
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Property report submitted successfully. Thank you for your feedback.",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "listingId": "550e8400-e29b-41d4-a716-446655440000",
    "projectId": null,
    "reason": "FRAUD_MISREPRESENTATION",
    "reporterName": "Ahmed Al-Otaibi",
    "reporterEmail": "ahmed@example.com",
    "description": "The listing shows 5 bedrooms but actually has 3. The photos are from a different property.",
    "status": "PENDING",
    "createdAt": "2024-06-19T14:30:00Z"
  }
}
```

### Response Fields Explained
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique report ID (for tracking) |
| `listingId` | UUID | Property being reported |
| `projectId` | UUID | Project ID (if report is for project listing) |
| `reason` | string | Violation category |
| `reporterName` | string | Who filed the report |
| `reporterEmail` | string | Contact email |
| `description` | string | Detailed explanation |
| `status` | string | Always "PENDING" on creation (can be updated to RESOLVED/DISMISSED by admin) |
| `createdAt` | ISO timestamp | When report was filed |

### Response Errors

**400 - Missing Required Fields**
```json
{
  "success": false,
  "message": "Reason, reporter name, and email are required fields."
}
```

**404 - Listing Not Found**
```json
{
  "success": false,
  "message": "Listing not found"
}
```

**500 - Server Error**
```json
{
  "success": false,
  "message": "Failed to submit report",
  "error": "Error details..."
}
```

### How It Works (Flow)
1. **User submits report** in mobile app
2. **App validates**:
   - Reason is provided
   - Reporter name is not empty
   - Reporter email is valid format
3. **Server validates**:
   - All required fields present
   - Listing/property exists (match by ID or shortId)
4. **Storage**: Record stored in `listing_reports` table with status "PENDING"
5. **Admin Review**: Admin can view in admin dashboard → "Reported Properties"
   - View aggregated report counts
   - Change status to RESOLVED or DISMISSED
6. **Response**: Confirmation sent to user

---

# SIMILAR PROPERTIES ENDPOINT

## GET /api/v1/listings
**Fetch similar listings based on location and property type**

### Purpose
Find properties that are similar to a target property. The client can achieve this by querying listings in the same city with the same property type.

### Request
```bash
GET /api/v1/listings?city=riyadh&type=APARTMENT&limit=4
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | ✓ | City of the target property (e.g., "riyadh", "jeddah") |
| `type` | string | ✓ | Property type (e.g., "APARTMENT", "VILLA") |
| `limit` | number | ✗ | Limit the number of returned results (default/recommended: 4) |

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "shortId": "SRE-A1B2C3",
        "type": "APARTMENT",
        "purpose": "SALE",
        "price": 650000,
        "city": "riyadh",
        "district": "Al-Malqa",
        "arTitle": "شقة فاخرة بحي الملقا",
        "enTitle": "Luxury Apartment in Al-Malqa",
        "bedrooms": 3,
        "bathrooms": 2,
        "areaSqm": "120",
        "photos": [
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80"
        ],
        "createdAt": "2024-06-19T14:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### Tiered Fetching Logic for Mobile App
To ensure the user always sees similar properties, the mobile app should implement a fallback sequence:
1. **Tier 1:** Fetch with same city and same type:
   `GET /api/v1/listings?city={targetCity}&type={targetType}&limit=4`
2. **Tier 2 (Fallback):** If Tier 1 returns no results (or only the target listing itself), fetch by type only:
   `GET /api/v1/listings?type={targetType}&limit=4`
3. **Tier 3 (Fallback):** If Tier 2 still yields no results, fetch recent listings without filtering:
   `GET /api/v1/listings?limit=4`

**Filter Note:** The response might include the target property itself. The mobile app client **must** filter out the target property from the UI list:
```typescript
const filteredSimilar = data.items.filter(item => item.id !== targetPropertyId).slice(0, 3);
```