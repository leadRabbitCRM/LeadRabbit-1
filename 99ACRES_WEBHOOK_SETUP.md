# 99acres Webhook Integration

## Overview
This webhook endpoint receives real-time lead data from 99acres when customers respond to property queries. The webhook automatically creates leads in the CRM system for all customers with active 99acres integrations.

## Webhook URL
```
POST https://yourdomain.com/api/webhook/99acres
```

## Request Format

### Headers
```
Content-Type: application/xml
```

### Request Body (XML)
The webhook expects XML data in the following format:

```xml
<?xml version='1.0'?>
<Xml ActionStatus="true">
    <Resp>
        <QryDtl ResType="S2M" QueryId="6958d4631514d37f9c23338d">
            <CmpctLabl><![CDATA[Rs. 26.4 Lac,  for Sale in Beerihundi ]]></CmpctLabl>
            <QryInfo><![CDATA[]]></QryInfo>
            <RcvdOn><![CDATA[2026-01-03 14:03:39]]></RcvdOn>
            <ProjId><![CDATA[]]></ProjId>
            <ProjName><![CDATA[]]></ProjName>
            <CityName><![CDATA[Mysore]]></CityName>
            <ResCom><![CDATA[R]]></ResCom>
            <Price><![CDATA[2640000]]></Price>
            <PhoneVerificationStatus><![CDATA[VERIFIED]]></PhoneVerificationStatus>
            <EmailVerificationStatus><![CDATA[UNVALIDATED]]></EmailVerificationStatus>
            <IDENTITY><![CDATA[Individual]]></IDENTITY>
            <PROPERTY_CODE><![CDATA[P87570474]]></PROPERTY_CODE>
            <SubUserName><![CDATA[]]></SubUserName>
            <ProdId Status="Active" Type="LP-I"><![CDATA[P87570474]]></ProdId>
        </QryDtl>
        <CntctDtl>
            <Name><![CDATA[Mrudula Padma]]></Name>
            <Email><![CDATA[mrudula.sharma@gmail.com]]></Email>
            <Phone><![CDATA[+91-9886677972]]></Phone>
        </CntctDtl>
    </Resp>
    <!-- Multiple <Resp> elements can be included -->
</Xml>
```

### XML Elements
| Element | Description | Example |
|---------|-------------|---------|
| `QueryId` | Unique query identifier | `6958d4631514d37f9c23338d` |
| `ResType` | Response type (S2M = Seller to Moive) | `S2M` |
| `CmpctLabl` | Property description | `Rs. 26.4 Lac, for Sale in Beerihundi` |
| `RcvdOn` | When query was received | `2026-01-03 14:03:39` |
| `Price` | Property price in rupees | `2640000` |
| `CityName` | City name | `Mysore` |
| `ResCom` | Type: R=Residential, C=Commercial | `R` |
| `PropertyCode` | Property code | `P87570474` |
| `PhoneVerificationStatus` | Phone verification status | `VERIFIED` |
| `EmailVerificationStatus` | Email verification status | `UNVALIDATED` |
| `Name` | Customer name | `Mrudula Padma` |
| `Email` | Customer email | `mrudula.sharma@gmail.com` |
| `Phone` | Customer phone | `+91-9886677972` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "leadsProcessed": 2,
  "message": "Successfully processed 2 leads",
  "timestamp": "2026-01-03T14:03:39.000Z"
}
```

### Error Response (400/500)
```json
{
  "success": false,
  "error": "Invalid XML structure",
  "message": "ActionStatus is false"
}
```

## How It Works

1. **Receives XML Data**: Accepts real-time lead data from 99acres
2. **Validates XML**: Checks for ActionStatus="true"
3. **Finds Active Accounts**: Looks for customers with active 99acres integrations
4. **Creates Leads**: Inserts lead data into each customer's leads collection
5. **Deduplication**: Prevents duplicate leads using QueryId
6. **Logging**: Records all processing in console logs

## Lead Storage

Each lead is stored in the CRM `leads` collection with:

### Basic Fields
- `source`: "99acres"
- `name`: Customer name
- `email`: Customer email (normalized to lowercase)
- `phone`: Customer phone number
- `status`: "New"
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Metadata (metaData object)
- `platform`: "99acres"
- `queryId`: Unique query identifier (used for deduplication)
- `responseType`: S2M, etc.
- `propertyDescription`: Full property details
- `receivedOn`: When the query was received
- `projectId`: Project identifier
- `projectName`: Project name
- `cityName`: City of property
- `propertyType`: R (Residential) or C (Commercial)
- `price`: Property price
- `phoneVerified`: Boolean
- `emailVerified`: Boolean
- `propertyCode`: Property code
- `productId`: Product identifier
- `productStatus`: Active/Inactive
- `productType`: Product type (LP-I, etc.)

## Multi-Tenant Support

The webhook automatically distributes leads to all customers with active 99acres integrations:

- ✅ Scans all customer databases
- ✅ Checks for active 99acres accounts
- ✅ Creates leads in corresponding customer databases
- ✅ Maintains data isolation

## Setup Instructions

### 1. Configure with 99acres
Provide your 99acres account manager with this webhook URL:
```
https://yourdomain.com/api/webhook/99acres
```

### 2. Verify Webhook is Working
- Enable your 99acres integration in LeadRabbit
- Set account to active
- Wait for incoming webhooks
- Check server logs for confirmation messages

### 3. Monitor Logs
Look for messages like:
```
✅ 99acres webhook: Lead "John Doe" created for customer MyCompany (ID: 65xxx)
✅ 99acres webhook completed: 5 leads processed across customers: MyCompany, OtherCo
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid XML structure` | Malformed XML | Verify XML format with 99acres team |
| `ActionStatus is false` | API error from 99acres | Check 99acres account status |
| `No active 99acres accounts found` | No active integrations | Enable 99acres integration |

### Logs
All webhook activity is logged to console with timestamps:
```
📨 99acres webhook received: 2 lead(s) to process
✅ 99acres webhook: Lead "Name" created for customer Company
⚠️ 99acres webhook: Duplicate lead detected (QueryId: xxx)
✅ 99acres webhook completed: 2 leads processed
```

## Testing

### Test with curl
```bash
curl -X POST https://yourdomain.com/api/webhook/99acres \
  -H "Content-Type: application/xml" \
  -d @webhook-test.xml
```

### Test Payload
Use the sample XML provided in the request format section above.

## Support
If you encounter issues:
1. Check server logs for error messages
2. Verify 99acres account is active and configured
3. Ensure webhook URL is correct
4. Contact 99acres support to verify their end is sending data
