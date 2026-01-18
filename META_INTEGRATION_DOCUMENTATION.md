# Meta Integration Documentation - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Access Token Management](#access-token-management)
4. [Webhook System](#webhook-system)
5. [Lead Sync Process](#lead-sync-process)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Complete User Journey](#complete-user-journey)

---

## Overview

The Meta (Facebook/Instagram) integration in LeadRabbit is a complete solution for capturing and managing leads from Facebook and Instagram Lead Ads. The system automatically syncs leads in real-time through webhooks and allows manual synchronization on demand.

### Key Features:
- ✅ **Dual Platform Support**: Facebook and Instagram Lead Ads
- ✅ **Real-time Webhook Processing**: Automatic lead capture
- ✅ **Manual Sync**: On-demand lead synchronization
- ✅ **Secure Token Storage**: Page-level access tokens stored in database
- ✅ **Multi-page Support**: Manage multiple Facebook pages and Instagram accounts
- ✅ **Lead Status Management**: Enable/disable lead capture per page

---

## Authentication Flow

### Step-by-Step Login & Authorization Process

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES LOGIN                                         │
│    └─> Admin clicks "Connect" button in /admin/connectors       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 2. REDIRECT TO FACEBOOK OAUTH                                   │
│    └─> Application calls: GET /api/facebook/auth (no code)      │
│    └─> Route redirects to Facebook OAuth URL                    │
│                                                                  │
│    URL Structure:                                               │
│    https://www.facebook.com/v18.0/dialog/oauth?                │
│    ├─ client_id={YOUR_APP_ID}                                  │
│    ├─ redirect_uri={https://yourdomain.com/api/facebook/auth}  │
│    ├─ scope=pages_show_list,pages_read_engagement,leads_retriev│
│    │        pages_manage_metadata                              │
│    └─ response_type=code                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 3. USER GRANTS PERMISSIONS ON FACEBOOK                          │
│    └─> User sees Facebook Login screen                          │
│    └─> User sees permission request screen                      │
│    └─> User clicks "Continue as [Name]" or logs in             │
│    └─> Facebook generates authorization code                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 4. FACEBOOK REDIRECTS BACK WITH CODE                            │
│    └─> Facebook redirects to:                                  │
│        {REDIRECT_URL}?code={AUTHORIZATION_CODE}&state={STATE}  │
│                                                                 │
│    └─> Application receives authorization code                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 5. EXCHANGE CODE FOR ACCESS TOKEN                              │
│    └─> Server calls: POST /api/facebook/auth with code         │
│    └─> Server sends code to Facebook token endpoint:           │
│                                                                 │
│    POST https://graph.facebook.com/v18.0/oauth/access_token    │
│    {                                                            │
│      client_id: {APP_ID},                                      │
│      client_secret: {APP_SECRET},                              │
│      code: {AUTHORIZATION_CODE},                               │
│      redirect_uri: {REDIRECT_URL}                              │
│    }                                                            │
│                                                                 │
│    Response:                                                    │
│    {                                                            │
│      access_token: "USER_ACCESS_TOKEN",                        │
│      token_type: "bearer",                                     │
│      expires_in: 5184000  ⬅️ Token valid for 60 days          │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 6. FETCH USER'S FACEBOOK PAGES                                 │
│    └─> Using USER_ACCESS_TOKEN, fetch list of pages:          │
│                                                                 │
│    GET https://graph.facebook.com/v18.0/me/accounts?           │
│        access_token={USER_ACCESS_TOKEN}                        │
│                                                                 │
│    Response:                                                    │
│    {                                                            │
│      data: [                                                   │
│        {                                                       │
│          id: "PAGE_ID",                                        │
│          name: "Page Name",                                    │
│          access_token: "PAGE_ACCESS_TOKEN",                    │
│          tasks: ["MANAGE", "ANALYZE", "CREATE_CONTENT"]        │
│        },                                                       │
│        ...more pages                                           │
│      ]                                                          │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 7. STORE PAGE ACCESS TOKENS IN DATABASE                         │
│    └─> For each page, insert/update in meta_pages collection: │
│                                                                 │
│    {                                                            │
│      pageId: "PAGE_ID",                                        │
│      name: "Page Name",                                        │
│      accessToken: "PAGE_ACCESS_TOKEN", ⬅️ Long-lived token    │
│      isActive: false,  ⬅️ User must enable explicitly         │
│      lastUpdated: Date,                                        │
│      leadForms: [],                                            │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│ 8. REDIRECT BACK TO APP                                         │
│    └─> Redirect to: /admin/connectors?facebook_auth=success   │
│    └─> Frontend shows list of connected pages                  │
│    └─> User can enable/disable pages as needed                │
└─────────────────────────────────────────────────────────────────┘
```

### Summary of Step 1-8:
1. **User clicks "Connect"** - Initiates OAuth flow
2. **Redirected to Facebook** - Permission screen shown
3. **User grants permissions** - Facebook verifies identity
4. **Authorization code received** - Facebook redirects back
5. **Code exchanged for token** - Server gets access token
6. **Pages fetched** - Server retrieves all user's pages
7. **Pages stored** - Access tokens saved in database
8. **Back to app** - User sees their connected pages

---

## Access Token Management

### Token Types & Validity

#### 1. **User Access Token**
- **Validity**: 60 days (5,184,000 seconds)
- **Purpose**: Fetch user's list of pages
- **Renewal**: Not automatically renewed (see refresh token section)
- **Storage**: NOT stored in database (temporary, only used during auth)
- **Scope**: `pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata`

#### 2. **Page Access Token** ⭐ (Most Important)
- **Validity**: **NEVER expires** (as long as the page exists)
- **Purpose**: Access page's leads, lead forms, and manage configuration
- **Renewal**: Manually refresh by re-authenticating
- **Storage**: **Stored in `meta_pages` collection** in database
- **Scope**: Inherited from page permissions
- **How to use**: Include in API requests to Meta Graph API

**Token Structure:**
```
Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ik5...UzI1NiJ9.eyJzdWIiOi...M1NzU1NWJm...
```

### Token Lifecycle

```
┌─────────────────┐
│  User Logs In   │ ──> Get USER_ACCESS_TOKEN (60 days)
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Fetch Pages with USER_ACCESS_TOKEN   │
│ └─ Receive PAGE_ACCESS_TOKEN         │
│    (valid forever)                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Store PAGE_ACCESS_TOKEN in Database  │
│ ├─ Collection: meta_pages            │
│ ├─ Field: accessToken                │
│ └─ Expires: NEVER (page must exist)  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Use PAGE_ACCESS_TOKEN for All Future │
│ Lead Operations                      │
│ ├─ Fetch leads                       │
│ ├─ Get lead forms                    │
│ ├─ Enable/disable webhooks           │
│ └─ Manage page settings              │
└──────────────────────────────────────┘
```

### Is There a Refresh Token?

**Short Answer: No, not for Facebook OAuth.**

Facebook's OAuth flow differs from Google's OAuth:
- **Google**: Provides both access token + refresh token (refresh token manually)
- **Facebook**: Provides only access token (page tokens don't expire)

**Why?**
- User access tokens: 60-day expiration
- Page access tokens: No expiration (until page is deleted)
- No refresh token mechanism in Facebook OAuth 2.0 spec

**What to do when tokens expire:**

| Scenario | Solution |
|----------|----------|
| User access token expires (60 days) | User must re-authenticate via "Connect" button |
| Page access token stops working | Usually means page was deleted or user lost access |
| Periodic token refresh needed | Re-run OAuth flow quarterly (recommended) |

---

## Webhook System

### How Real-Time Lead Capture Works

```
┌────────────────────────────────────────────────────────────────┐
│ WEBHOOK SETUP & VERIFICATION                                  │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ 1. CONFIGURE WEBHOOK IN FACEBOOK APP                           │
│    └─ Facebook App Settings > Webhooks                        │
│    └─ Set Callback URL: https://yourdomain.com/api/webhook   │
│    └─ Set Verify Token: {FACEBOOK_WEBHOOK_VERIFY_TOKEN}      │
│    └─ Subscribe to: leadgen (Lead Generation events)          │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ 2. FACEBOOK VERIFIES WEBHOOK                                  │
│    └─ Facebook sends GET request to callback URL:             │
│                                                                │
│    GET /api/webhook/facebook?                                 │
│        hub.mode=subscribe&                                    │
│        hub.challenge={CHALLENGE_TOKEN}&                       │
│        hub.verify_token={VERIFY_TOKEN}                        │
│                                                                │
│    └─ Server validates:                                       │
│       ├─ Mode === "subscribe"                                 │
│       ├─ verify_token === FACEBOOK_WEBHOOK_VERIFY_TOKEN       │
│       └─ Returns challenge to confirm ownership                │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ 3. WEBHOOK ACTIVE - READY FOR EVENTS                          │
│    └─ Status: ✅ Connected                                    │
│    └─ Waiting for lead events...                              │
└────────────────────────┬───────────────────────────────────────┘
                         │
    ┌────────────────────────────────────────────────────────────┐
    │ LATER: USER SUBMITS FACEBOOK/INSTAGRAM LEAD AD             │
    └────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 4. FACEBOOK SENDS WEBHOOK EVENT (POST REQUEST)                │
│                                                                │
│    POST /api/webhook/facebook HTTP/1.1                        │
│    X-Hub-Signature-256: sha256=SIGNATURE                      │
│    Content-Type: application/json                             │
│                                                                │
│    {                                                           │
│      "entry": [{                                              │
│        "id": "PAGE_ID",                                       │
│        "time": 1234567890,                                    │
│        "messaging": [{                                        │
│          "sender": { "id": "USER_ID" },                      │
│          "message": { ... }                                   │
│        }],                                                     │
│        "changes": [{                                          │
│          "value": {                                           │
│            "leadgen_id": "LEAD_ID",                          │
│            "form_id": "FORM_ID",                             │
│            "page_id": "PAGE_ID",                             │
│            "created_time": 1234567890,                       │
│            "ad_id": "AD_ID",                                 │
│            "field_data": [                                   │
│              { "name": "email", "value": "user@example.com" }│
│              { "name": "phone_number", "value": "+1234567" } │
│              { "name": "first_name", "value": "John" }       │
│            ]                                                   │
│          },                                                    │
│          "field": "leadgen"                                   │
│        }]                                                      │
│      }]                                                        │
│    }                                                           │
└────────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 5. SERVER VALIDATES WEBHOOK SIGNATURE                         │
│                                                                │
│    X-Hub-Signature-256 verification:                         │
│    ├─ Compute: HMAC-SHA256(                                   │
│    │     key=FACEBOOK_APP_SECRET,                             │
│    │     msg=RAW_REQUEST_BODY                                 │
│    │   )                                                       │
│    ├─ Compare with header signature                           │
│    └─ Reject if signature doesn't match (security!)           │
└────────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 6. EXTRACT LEAD DATA                                          │
│                                                                │
│    └─ Parse lead information:                                │
│       ├─ leadId                                              │
│       ├─ formId                                              │
│       ├─ pageId                                              │
│       ├─ platform: "facebook" | "instagram"                 │
│       ├─ createdTime                                        │
│       ├─ fieldData: [emails, phones, names, etc]           │
│       └─ originalFields: raw data for reference             │
└────────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 7. STORE IN meta_leads COLLECTION                             │
│                                                                │
│    db.meta_leads.insertOne({                                  │
│      leadId: "LEAD_ID",                                       │
│      formId: "FORM_ID",                                       │
│      pageId: "PAGE_ID",                                       │
│      platform: "facebook",                                    │
│      created_time: Date,                                      │
│      field_data: [...],                                       │
│      originalFields: {...},                                   │
│      processed: false                                         │
│    })                                                          │
└────────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 8. CONVERT TO CRM LEAD FORMAT                                 │
│                                                                │
│    db.leads.insertOne({                                       │
│      name: "John Doe",                                        │
│      email: "john@example.com",                               │
│      phone: "+1 (555) 123-4567",                             │
│      source: "facebook",  // or "instagram"                   │
│      status: "New",                                           │
│      tags: ["facebook-lead"],                                 │
│      metaData: {                                              │
│        leadId: "LEAD_ID",                                     │
│        formId: "FORM_ID",                                     │
│        pageId: "PAGE_ID",                                     │
│        platform: "facebook",                                  │
│        originalFields: {...}                                  │
│      },                                                        │
│      createdAt: Date                                          │
│    })                                                          │
└────────────────┬───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│ 9. MARK AS PROCESSED                                          │
│    └─ Update meta_leads: processed = true                     │
│    └─ Log successful processing                               │
│    └─ Return 200 OK to Facebook                               │
└────────────────────────────────────────────────────────────────┘
```

### Webhook Signature Validation

**Security Feature: Signature Verification**

```javascript
// How Facebook signs the webhook
const crypto = require('crypto');
const body = JSON.stringify(event);
const signature = crypto
  .createHmac('sha256', FACEBOOK_APP_SECRET)
  .update(body)
  .digest('hex');

// Request header will be:
// X-Hub-Signature-256: sha256=<signature>
```

**Server-side validation:**
```javascript
// Verify signature on received webhook
import crypto from 'crypto';

function verifyWebhookSignature(body, signature, appSecret) {
  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');
  
  return hash === signature.replace('sha256=', '');
}
```

---

## Lead Sync Process

### Manual Sync Flow

When user clicks "Sync" button in `/admin/connectors`:

```
┌────────────────────────────────────────────┐
│ USER CLICKS "SYNC" BUTTON                 │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Frontend Call: POST /api/facebook/sync    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 1. FETCH ALL ENABLED PAGES                │
│    └─ Query: db.meta_pages.find({         │
│           isActive: true                  │
│       })                                   │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 2. FOR EACH PAGE:                         │
│                                            │
│    a) GET LEAD FORMS                      │
│       GET /v18.0/{pageId}/leadgen_forms  │
│           ?access_token={PAGE_TOKEN}      │
│                                            │
│    b) Response contains form_id list      │
│                                            │
│    c) UPDATE meta_pages with form list:   │
│       {                                    │
│         leadForms: [                      │
│           { formId, name, createdTime }  │
│         ]                                  │
│       }                                    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 3. FOR EACH LEAD FORM:                    │
│                                            │
│    a) FETCH NEW LEADS                     │
│       GET /v18.0/{formId}/leads?          │
│           access_token={PAGE_TOKEN}       │
│                                            │
│    b) Get leads created after lastSync    │
│       (default: all new leads since 24h)  │
│                                            │
│    c) Response:                            │
│       {                                    │
│         data: [                            │
│           {                                │
│             id: "LEAD_ID",                │
│             created_time: "2025-01-10",   │
│             field_data: [{                │
│               name: "email",              │
│               value: "user@example.com"  │
│             }]                             │
│           },                               │
│           ...more leads                   │
│         ]                                  │
│       }                                    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 4. FILTER EXISTING LEADS                  │
│    └─ Check: db.meta_leads.find({         │
│           leadId: { $in: [ids] }          │
│       })                                   │
│    └─ Skip if already in database         │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 5. STORE NEW LEADS IN meta_leads          │
│    └─ Insert: {                           │
│           leadId, formId, pageId,         │
│           platform, created_time,         │
│           field_data, processed: false    │
│       }                                    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 6. CONVERT TO CRM LEADS                   │
│    └─ Parse field_data                    │
│    └─ Extract: name, email, phone, etc    │
│    └─ Create in leads collection          │
│    └─ Set source: "facebook"|"instagram"  │
│    └─ Mark with metaData                  │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 7. UPDATE SYNC TIMESTAMP                  │
│    └─ meta_pages.lastSync = now()         │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 8. RETURN RESULTS TO FRONTEND             │
│    └─ leadsSynced: count                  │
│    └─ success: true/false                 │
└────────────────────────────────────────────┘
```

### Comparison: Real-time vs Manual Sync

| Feature | Webhook (Real-time) | Manual Sync |
|---------|-------------------|-------------|
| **Speed** | Instant (< 1 second) | On-demand |
| **Delay** | None | User clicks sync |
| **Automatic** | ✅ Yes | ❌ No (manual) |
| **Coverage** | Only new leads | Catch-up for missed leads |
| **Best For** | Continuous capture | Recovery, data validation |
| **Resource Usage** | Low (event-driven) | High (API calls) |

---

## API Endpoints

### 1. **GET /api/facebook/auth**

**Purpose**: Initiate Facebook OAuth or callback from Facebook

**Request (Without Code)**:
```http
GET /api/facebook/auth HTTP/1.1
Host: yourdomain.com
```

**Response**:
Redirects to Facebook OAuth URL

**Request (With Code - From Facebook)**:
```http
GET /api/facebook/auth?code=ABC123DEF456 HTTP/1.1
Host: yourdomain.com
```

**Response (Success)**:
```http
HTTP/1.1 307 Temporary Redirect
Location: https://yourdomain.com/admin/connectors?facebook_auth=success
Set-Cookie: appToken=...; Path=/; HttpOnly
```

**Response (Error)**:
```json
{
  "error": "Error message from Facebook"
}
```

---

### 2. **GET /api/webhook/facebook** (Verification)

**Purpose**: Facebook verifies webhook ownership

**Request** (from Facebook):
```http
GET /api/webhook/facebook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE HTTP/1.1
```

**Response** (Success):
```
CHALLENGE_TOKEN (plain text)
```

**Response** (Failure):
```
403 Forbidden
```

---

### 3. **POST /api/webhook/facebook** (Lead Events)

**Purpose**: Receive lead data from Facebook/Instagram in real-time

**Request** (from Facebook):
```http
POST /api/webhook/facebook HTTP/1.1
Content-Type: application/json
X-Hub-Signature-256: sha256=SIGNATURE
X-Hub-ID: APP_ID
X-Hub-Source: partners
X-Hub-Signature: SIGNATURE_256

{
  "entry": [{
    "id": "PAGE_ID",
    "time": 1234567890,
    "changes": [{
      "value": {
        "leadgen_id": "LEAD_ID",
        "form_id": "FORM_ID",
        "page_id": "PAGE_ID",
        "created_time": 1234567890,
        "ad_id": "AD_ID",
        "field_data": [
          { "name": "email", "value": "user@example.com" },
          { "name": "phone_number", "value": "+1234567890" },
          { "name": "first_name", "value": "John" },
          { "name": "last_name", "value": "Doe" }
        ]
      },
      "field": "leadgen"
    }]
  }]
}
```

**Response** (Success):
```json
{
  "success": true,
  "leadsProcessed": 1
}
```

**Response** (Error):
```json
{
  "error": "Error message",
  "success": false
}
```

---

### 4. **POST /api/facebook/sync**

**Purpose**: Manually synchronize leads from enabled pages

**Request**:
```http
POST /api/facebook/sync HTTP/1.1
Content-Type: application/json
```

**Response** (Success):
```json
{
  "success": true,
  "leadsSynced": 25,
  "pagesProcessed": 2,
  "message": "Successfully synced leads"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Error message"
}
```

---

### 5. **POST /api/facebook/pages** (Manage Pages)

**Purpose**: Enable/disable page integration or delete page

**Request** (Enable/Disable):
```http
POST /api/facebook/pages HTTP/1.1
Content-Type: application/json

{
  "pageId": "PAGE_ID",
  "action": "enable" | "disable"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Page enabled successfully"
}
```

**Request** (Delete Page):
```http
DELETE /api/facebook/pages HTTP/1.1
Content-Type: application/json

{
  "pageId": "PAGE_ID"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Page deleted successfully"
}
```

---

### 6. **GET /api/facebook/pages**

**Purpose**: Get list of connected pages (called on connectors page load)

**Request**:
```http
GET /api/facebook/pages HTTP/1.1
```

**Response**:
```json
[
  {
    "pageId": "PAGE_ID_1",
    "name": "My Business Page",
    "isActive": true,
    "lastUpdated": "2025-01-10T12:30:00Z",
    "leadForms": [
      {
        "formId": "FORM_ID_1",
        "name": "Lead Form 1",
        "leads": []
      }
    ]
  },
  {
    "pageId": "PAGE_ID_2",
    "name": "My Instagram",
    "isActive": false,
    "lastUpdated": "2025-01-09T10:15:00Z",
    "leadForms": []
  }
]
```

---

## Database Schema

### Collection: `meta_pages`

Stores information about connected Facebook/Instagram pages and their access tokens.

```javascript
{
  _id: ObjectId,
  
  // Page Identification
  pageId: "1234567890",              // Facebook Page ID or Instagram Account ID
  name: "My Business Page",           // Display name
  
  // Authentication & Authorization
  accessToken: "EAAbZ...",            // Page access token (never expires)
  
  // Status Management
  isActive: true,                     // Is this page enabled for lead capture?
  lastUpdated: ISODate("2025-01-10"), // Last modification time
  
  // Lead Forms Configuration
  leadForms: [
    {
      formId: "FORM_ID_1",
      name: "Contact Us Form",
      leads: [
        { leadId: "LEAD_ID_1", createdTime: ISODate() },
        { leadId: "LEAD_ID_2", createdTime: ISODate() }
      ]
    }
  ],
  
  // Sync Tracking
  lastSync: ISODate("2025-01-10T14:30:00"),  // Last manual sync time
  syncCount: 42,                             // Number of times synced
  
  // Metadata
  createdAt: ISODate("2025-01-08"),
  updatedAt: ISODate("2025-01-10")
}
```

### Collection: `meta_leads`

Stores raw Meta lead data from webhooks or manual sync.

```javascript
{
  _id: ObjectId,
  
  // Lead Identification
  leadId: "LEAD_ID_1",                    // Unique lead ID from Facebook
  
  // Form & Page Information
  formId: "FORM_ID_1",                    // Lead form ID
  pageId: "PAGE_ID_1",                    // Facebook page ID
  
  // Platform Detection
  platform: "facebook",                   // "facebook" or "instagram"
  
  // Lead Data
  created_time: ISODate("2025-01-10T12:00:00"),
  field_data: [
    { name: "email", value: "user@example.com" },
    { name: "phone_number", value: "+1 (555) 123-4567" },
    { name: "first_name", value: "John" },
    { name: "last_name", value: "Doe" },
    { name: "company", value: "Acme Corp" }
  ],
  
  // Processing Status
  processed: true,                        // Has this been converted to CRM lead?
  
  // Original Data
  originalFields: {...},                  // Raw data from Facebook
  
  // Timestamps
  createdAt: ISODate("2025-01-10T12:00:00"),
  processedAt: ISODate("2025-01-10T12:00:05")
}
```

### Collection: `leads` (Extended)

Existing CRM leads collection with Meta data.

```javascript
{
  _id: ObjectId,
  
  // Basic Information
  name: "John Doe",
  email: "john@example.com",
  phone: "+1 (555) 123-4567",
  company: "Acme Corp",
  
  // Lead Status
  status: "New",                          // new, contacted, qualified, etc.
  
  // Source Tracking
  source: "facebook",                     // "facebook", "instagram", "manual", "website", "other"
  
  // Meta Integration Data
  metaData: {
    leadId: "LEAD_ID_1",                 // Unique ID from Facebook
    formId: "FORM_ID_1",                 // Form lead came from
    pageId: "PAGE_ID_1",                 // Which page/account
    platform: "facebook",                // "facebook" or "instagram"
    originalFields: {...}                // All raw field data from form
  },
  
  // Tags & Classification
  tags: ["facebook-lead", "hot-lead", "demo-requested"],
  
  // History & Timestamps
  createdAt: ISODate("2025-01-10T12:00:00"),
  updatedAt: ISODate("2025-01-10T12:05:00"),
  
  // Relationships
  meetings: [ObjectId],                  // Related meeting IDs
  conversations: [ObjectId],             // Related message IDs
  notes: [...]                           // Activity notes
}
```

---

## Environment Variables

### Required Variables

```bash
# ============================================
# META INTEGRATION - FACEBOOK/INSTAGRAM
# ============================================

# Facebook App Credentials
FACEBOOK_CLIENT_ID=2228457047567922
FACEBOOK_CLIENT_SECRET=5cb33a7a28387987020e29a0119ca7b1

# Facebook App Secret (for webhook signature verification)
FACEBOOK_APP_SECRET=5cb33a7a28387987020e29a0119ca7b1

# Webhook Verification
# Choose any secure random string, set both in Facebook App and here
FACEBOOK_WEBHOOK_VERIFY_TOKEN=MySecure_WebhookToken_2025_!@#$%

# Application URLs
URL=http://localhost:4000              # Development
# URL=https://yourdomain.com            # Production
REDIRECT_URL=http://localhost:4000/api/facebook/auth

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=leadRabbit

# ============================================
# NEXTAUTH (if using session management)
# ============================================
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=your_nextauth_secret_here_minimum_32_characters

# ============================================
# APP SETTINGS
# ============================================
NODE_ENV=development  # or "production"
```

### Where to Set These

**Development**:
1. Create `.env.local` in project root
2. Add all variables above
3. Restart development server

**Production**:
1. Set environment variables in hosting platform:
   - Vercel: Settings > Environment Variables
   - Heroku: Settings > Config Vars
   - AWS: Lambda > Environment Variables
   - Docker: docker run -e VAR=value
2. Never commit `.env.local` to git

---

## Complete User Journey

### Scenario: Lead Manager integrating Meta leads for first time

```
WEEK 1: SETUP
═══════════════════════════════════════════════════════════════

Step 1: Create Facebook App
  └─ Go to: https://developers.facebook.com
  └─ Create New App
  └─ Note: App ID, App Secret
  └─ Add Products: Facebook Login
  └─ Setup: Leads Retrieval

Step 2: Configure OAuth
  └─ Facebook App > Settings > Facebook Login
  └─ Add Valid OAuth Redirect URLs:
     https://yourdomain.com/api/facebook/auth
  └─ Setup: Leads Ads webhooks

Step 3: Setup Webhook
  └─ Facebook App > Settings > Webhooks
  └─ Callback URL: https://yourdomain.com/api/webhook/facebook
  └─ Verify Token: (choose secure token)
  └─ Subscribe to: leadgen events

Step 4: Environment Setup
  └─ Create .env.local
  └─ Add: FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, etc.
  └─ Restart server


WEEK 2: FIRST CONNECTION
═══════════════════════════════════════════════════════════════

Day 1: Admin Opens LeadRabbit
  └─ URL: https://yourdomain.com/admin/connectors
  └─ Sees: "+ Add" button for Meta Lead Ads

Day 2: Click "Connect"
  └─ Browser redirects to Facebook OAuth
  └─ Admin sees: "You are about to connect..."
  └─ Permissions shown: pages_show_list, leads_retrieval, etc.
  └─ Admin clicks: "Continue as [Name]"

Day 3: Authorization Complete
  └─ Browser redirects back to /admin/connectors
  └─ Success message shown
  └─ Page list appears:
     ├─ My Business Page (Facebook) - Disabled
     ├─ My Instagram Account (Instagram) - Disabled

Day 4: Enable Pages
  └─ Admin clicks "Disable All" button (wait, they're already disabled)
  └─ Actually: Admin clicks "Enable" on "My Business Page"
  └─ Modal: "Are you sure you want to enable?"
  └─ Admin clicks "Enable"
  └─ Page status changes to "Enabled"

Day 5: Enable Instagram Too
  └─ Admin clicks "Enable" on "My Instagram Account"
  └─ Both pages now enabled
  └─ System ready to receive leads


WEEK 3: LEADS ARRIVE
═══════════════════════════════════════════════════════════════

Day 1: Facebook Lead Created
  └─ User fills Facebook Lead Ad form
  └─ Data submitted to Facebook servers

Seconds later: Webhook Event
  └─ Facebook sends: POST /api/webhook/facebook
  └─ Payload includes: leadId, email, phone, name, etc.

  └─ Server receives event
  └─ Validates signature (security!)
  └─ Extracts lead data
  └─ Stores in meta_leads collection
  └─ Converts to CRM lead
  └─ Stores in leads collection
  └─ Returns: 200 OK

Within 30 seconds: Lead Appears in CRM
  └─ Admin/User opens: /user/allLeads
  └─ New lead visible at top
  └─ Status: "New"
  └─ Source: "Facebook" or "Instagram" (auto-detected)
  └─ Tags: "facebook-lead"
  └─ Can click to view full details


WEEK 4: LEAD RECOVERY (Catch-up Sync)
═══════════════════════════════════════════════════════════════

Day 1: Admin wants historical leads
  └─ Goes to: /admin/connectors
  └─ Clicks: "Sync" button
  └─ Processing... (API calls to Facebook)

Minute 1: System fetches
  └─ Gets all lead forms for enabled pages
  └─ Retrieves leads from past 24 hours
  └─ Checks if already in database
  └─ Inserts new ones

Minute 2: Conversion
  └─ 50 new leads converted to CRM format
  └─ Added to leads collection
  └─ Indexed and searchable

Minute 3: Completion
  └─ Success message: "Successfully synced 50 leads"
  └─ Alert notification shown
  └─ Leads immediately visible in all lead views


ONGOING: MONITORING
═══════════════════════════════════════════════════════════════

Daily:
  └─ Webhook handles new leads automatically
  └─ Real-time, no configuration needed
  └─ Leads appear within seconds

Weekly (Optional):
  └─ Run manual sync on Mondays
  └─ Catches any missed leads
  └─ Peace of mind

Monthly (Recommended):
  └─ Check stats on /admin/connectors
  └─ View: Enabled count, Disabled count, Total leads
  └─ Verify all pages still connected
  └─ Re-authenticate if access token issues


QUARTERLY (Maintenance)
═══════════════════════════════════════════════════════════════

Every 90 days:
  └─ Admin may need to re-authenticate
  └─ User access token expires after 60 days
  └─ Page tokens last longer but refresh recommended
  └─ Click "Connect" again to refresh
  └─ Takes < 1 minute
  └─ No data loss, just token refresh
```

---

## Token Refresh & Maintenance

### When Do Tokens Expire?

| Token | Expiration | How to Refresh |
|-------|-----------|----------------|
| **User Access Token** | 60 days | Re-authenticate via "Connect" button |
| **Page Access Token** | Never (until page deleted) | Stored in database, reused |
| **Webhook** | Indefinite | No refresh needed |

### Warning Signs

If you see these errors:
- `"(#102) Session has expired"` → User token expired, need "Connect"
- `"(#200) Permissions error"` → Page access token invalid, need "Connect"
- `"(#190) Invalid OAuth access token"` → Token revoked, need "Connect"

**Solution**: Admin clicks "Connect" button → Re-authenticates → Tokens refreshed

---

## Security Best Practices

### ✅ What We Do Right

1. **Webhook Signature Verification**: Every webhook is verified using HMAC-SHA256
2. **Token Storage**: Tokens stored in MongoDB, never exposed to frontend
3. **Environment Variables**: Secrets kept in .env.local, never committed to git
4. **HTTPS Only**: Webhooks require HTTPS in production
5. **Scope Limitation**: Only request necessary permissions

### 🔒 You Should Do

1. **Protect .env.local**: Add to .gitignore
2. **Use HTTPS**: Always use HTTPS in production
3. **Monitor Tokens**: Check webhook delivery in Facebook App settings
4. **Rotate Secrets**: Change FACEBOOK_WEBHOOK_VERIFY_TOKEN quarterly
5. **Audit Logs**: Monitor which pages are enabled/disabled
6. **Test Signature**: Verify webhook signature validation is working

---

## Troubleshooting

### Common Issues & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `"Invalid OAuth access token"` | Token expired | Click "Connect" to re-authenticate |
| `"(#200) Permissions error"` | Missing scopes | Re-authenticate with new scopes |
| Webhook not receiving leads | Webhook not subscribed | Check Facebook App > Webhooks |
| Leads not syncing | Pages disabled | Enable page in /admin/connectors |
| `"Webhook verification failed"` | Wrong verify token | Check FACEBOOK_WEBHOOK_VERIFY_TOKEN matches |

---

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│ META INTEGRATION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ AUTHENTICATION:                                             │
│  └─> OAuth 2.0 Flow                                        │
│      └─> Get User Access Token (60 day expiration)         │
│          └─> Fetch Page Access Tokens (never expire)       │
│              └─> Store in database                          │
│                                                              │
│ LEAD CAPTURE:                                              │
│  └─> Option 1: Real-time Webhooks (Preferred)             │
│      └─> Lead submitted → Facebook sends webhook event     │
│          └─> Signature verified → Data extracted          │
│              └─> Stored in meta_leads → Converted to lead │
│                  └─> Appears immediately (< 1 sec)        │
│                                                              │
│  └─> Option 2: Manual Sync                                │
│      └─> Admin clicks "Sync"                              │
│          └─> Fetch from Meta API                          │
│              └─> Filter duplicates → Store → Convert      │
│                  └─> Complete in 1-2 minutes              │
│                                                              │
│ TOKEN MANAGEMENT:                                          │
│  └─> User Token: 60 days (refresh by re-auth)             │
│  └─> Page Token: Never expires (stored in DB)             │
│  └─> No refresh token mechanism (Facebook limitation)      │
│      └─> Must re-authenticate quarterly                    │
│                                                              │
│ DATABASE:                                                  │
│  └─> meta_pages: Stores pages + access tokens             │
│  └─> meta_leads: Stores raw lead data                     │
│  └─> leads: Stores CRM leads with metaData                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: January 10, 2025
**Status**: Complete & Production Ready
