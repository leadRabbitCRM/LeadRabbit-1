# Meta Lead Ads Integration Setup Guide

## Overview

This guide will help you complete the Meta Lead Ads integration with your LeadRabbit CRM. This integration supports both Facebook and Instagram Lead Ads. We've implemented a comprehensive solution that includes webhook handling, OAuth authentication, and automatic lead synchronization.

## Prerequisites

- ✅ Facebook App created with Client ID and Secret (already done)
- ✅ Facebook and/or Instagram Lead Ads campaigns running
- ✅ MongoDB database connection (already configured)
- ✅ Next.js application running

## Setup Steps

### 1. Complete Environment Variables

Update your `.env.local` file with the missing values:

```bash
# Your existing Facebook credentials
FACEBOOK_CLIENT_ID=2228457047567922
FACEBOOK_CLIENT_SECRET=5cb33a7a28387987020e29a0119ca7b1

# Add these new variables
FACEBOOK_APP_SECRET=5cb33a7a28387987020e29a0119ca7b1  # Usually same as client secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_unique_token_here    # Choose any secure random string
USER_ACCESS_TOKEN=                                      # Will be populated after OAuth
```

**Action Required:**

- Set `FACEBOOK_WEBHOOK_VERIFY_TOKEN` to a secure random string (e.g., "MySecure_WebhookToken_123")

### 2. Facebook App Configuration

In your Facebook App settings (https://developers.facebook.com/apps/), configure:

#### A. App Permissions

Ensure your app has these permissions:

- `pages_show_list`
- `pages_read_engagement`
- `leads_retrieval`
- `pages_manage_metadata`

#### B. Webhook Configuration

1. Go to **Webhooks** in your app settings
2. Add a new webhook endpoint:
   - **Callback URL:** `https://yourdomain.com/api/webhook/facebook`
   - **Verify Token:** Use the same value as `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
   - **Fields:** Select `leadgen` (Lead Generation)

#### C. Lead Ads Webhooks

1. Go to **Products** → **Webhooks**
2. Select **Page** object
3. Subscribe to `leadgen` events

### 3. OAuth Setup

1. In Facebook App settings, go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs:**
   ```
   http://localhost:4000/api/facebook/auth
   https://yourdomain.com/api/facebook/auth
   ```

### 4. Test the Integration

#### A. Test Webhook Verification

```bash
# Run the test script
node scripts/test-facebook-webhook.js
```

#### B. Test Manual Sync

1. Start your application: `npm run dev`
2. Go to `/admin/connectors`
3. Click "Connect" to authenticate with Facebook
4. Enable integration for your Facebook page
5. Click "Sync" to manually fetch existing leads

### 5. Production Deployment

#### A. Update Environment Variables

Replace `localhost:4000` with your production domain in:

- `.env.local` → `URL` and `NEXTAUTH_URL`
- Facebook App OAuth settings

#### B. SSL Certificate

Ensure your production server has a valid SSL certificate (Facebook requires HTTPS for webhooks)

## How It Works

### 1. Authentication Flow

```
User clicks "Connect" → Facebook OAuth → Get page access tokens → Store in database
```

### 2. Webhook Flow

```
New Meta Lead (Facebook/Instagram) → Webhook notification → Verify signature → Process lead → Store in CRM
```

### 3. Data Flow

```
Meta Lead → meta_leads collection → Convert to CRM format → leads collection
```

## API Endpoints Created

- `GET /api/facebook/auth` - Facebook OAuth authentication
- `GET/POST /api/webhook/facebook` - Webhook verification and lead processing (handles both Facebook and Instagram)
- `GET/POST /api/facebook/pages` - Manage Meta pages and integration
- `POST /api/facebook/sync` - Manual lead synchronization

## Database Collections

### meta_pages

Stores Facebook/Instagram page information and access tokens

```javascript
{
  pageId: "string",
  name: "string",
  accessToken: "string",
  isActive: boolean,
  leadForms: [...],
  lastUpdated: Date
}
```

### meta_leads

Raw Meta lead data from Facebook and Instagram

```javascript
{
  leadId: "string",
  created_time: Date,
  field_data: [...],
  form_id: "string",
  page_id: "string",
  platform: "facebook" | "instagram",
  processed: boolean
}
```

### leads (existing)

Your CRM leads with Meta data

```javascript
{
  name: "string",
  email: "string",
  phone: "string",
  source: "facebook" | "instagram",
  status: "New",
  metaData: {
    leadId: "string",
    formId: "string",
    pageId: "string",
    platform: "facebook" | "instagram",
    originalFields: [...]
  },
  ...
}
```

## Features Implemented

✅ **Real-time Webhook Processing** - Instant lead capture from Facebook and Instagram
✅ **OAuth Authentication** - Secure Facebook/Instagram page connection
✅ **Manual Sync** - Fetch existing leads on-demand
✅ **Multi-page Support** - Handle multiple Facebook/Instagram pages
✅ **Platform Detection** - Automatically identify Facebook vs Instagram leads
✅ **Error Handling** - Comprehensive error logging and recovery
✅ **Data Validation** - Ensure lead data integrity
✅ **CRM Integration** - Seamless integration with existing lead system
✅ **Security** - Webhook signature verification
✅ **Admin UI** - Easy management from connector page

## Testing

### 1. Webhook Verification Test

```bash
curl "http://localhost:4000/api/webhook/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

### 2. Lead Processing Test

Use the provided test script or Facebook's Test Events tool in the app dashboard.

### 3. Integration Test

1. Create a test lead ad campaign
2. Submit a test lead
3. Check the CRM for the new lead

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**

   - Check `FACEBOOK_WEBHOOK_VERIFY_TOKEN` matches Facebook app settings
   - Ensure webhook URL is accessible

2. **OAuth Fails**

   - Verify redirect URI in Facebook app settings
   - Check app permissions

3. **Leads Not Syncing**

   - Check page access tokens are valid
   - Verify webhook subscription is active
   - Check logs for processing errors

4. **Signature Verification Fails**
   - Ensure `FACEBOOK_APP_SECRET` is correct
   - Check webhook payload format

### Logs to Check

- Browser console (connector page)
- Server logs (webhook processing)
- MongoDB logs (data storage)

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review server logs for webhook processing
3. Test webhook verification endpoint
4. Verify Facebook app configuration
5. Check MongoDB connections and data

The integration is now complete and ready for testing! 🚀
