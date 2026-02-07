# Cron Job Documentation - Lead Assignment Scheduler

## Overview

The LeadRabbit CRM uses an **automated cron job scheduler** to automatically assign unassigned leads to online users on a recurring basis. The system runs **every 10 minutes** and intelligently distributes leads across available team members.

---

## 🏗️ Architecture

### Three-Layer Initialization System

The cron job uses a **three-tier initialization approach** to ensure it starts at the earliest possible moment:

```
┌─────────────────────────────────────────────────────────┐
│ 1️⃣  instrumentation.ts (EARLIEST - Server Startup)    │
│    └─> Runs BEFORE anything else in Next.js           │
│    └─> Calls startCron() immediately                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2️⃣  initScheduler.ts (BACKUP - App Layout Import)     │
│    └─> Auto-initializes on server-side import         │
│    └─> Prevents double-initialization with flag       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3️⃣  scheduler.js (CORE - Lead Assignment Logic)       │
│    └─> Contains startCron() and assignLeads()         │
│    └─> Uses node-cron for scheduling                  │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Runtime |
|------|---------|---------|
| `instrumentation.ts` | Primary entry point at Next.js startup | Server (Node.js) |
| `lib/initScheduler.ts` | Secondary initialization with safety checks | Server (Node.js) |
| `app/layout.tsx` | Imports initScheduler to trigger scheduling | Browser & Server |
| `lib/scheduler.js` | Core scheduler logic and lead assignment | Server (Node.js) |
| `app/api/leads/cronJob/route.ts` | Manual trigger & status endpoint | Server (HTTP) |

---

## ⚙️ How It Works

### 1️⃣ Startup Flow

```
Next.js Server Starts
        ↓
instrumentation.ts register() runs
        ↓
startCron() is invoked
        ↓
Console banner displays
        ↓
First assignment runs IMMEDIATELY
        ↓
Cron schedule set to run every 10 minutes
        ↓
Scheduler is now ACTIVE ✅
```

### 2️⃣ Every 10 Minutes (Cron Schedule)

**Schedule Pattern:** `*/10 * * * *`
- Every 10 minutes
- Every hour, every day
- Continuous (24/7 while app is running)

When triggered:
```
Cron tick (*/10 * * * *)
        ↓
assignLeads() function called
        ↓
Fetch all ACTIVE customers from superadmin database
        ↓
For EACH customer:
  ├─ Get their database
  ├─ Fetch online, verified users
  ├─ Fetch unassigned leads
  └─ Distribute leads evenly
        ↓
Log completion with timestamp
```

### 3️⃣ Lead Distribution Algorithm

```javascript
// For each customer database:

1. GET ONLINE USERS
   - Query users where isOnline: true AND isVerified: true
   - Sort by email for consistent ordering
   
2. GET UNASSIGNED LEADS
   - Query leads where assignedTo is empty or null
   
3. CALCULATE DISTRIBUTION
   leadsPerUser = MIN(
     CEIL(unassignedLeads / onlineUsers),
     4  // Maximum 4 leads per user per cycle
   )
   
4. ASSIGN LEADS ROUND-ROBIN
   - Start from where we left off (lastAssignedUser)
   - Assign leadsPerUser to each user in rotation
   - Move to next user after each batch
   
5. UPDATE POINTER
   - Save lastAssignedIndex for next cycle
   - Save lastAssignedUser email
   - Save lastAssignedAt timestamp
```

**Example:**
```
Scenario:
- 10 unassigned leads
- 3 online users (Alice, Bob, Charlie)

Calculation:
leadsPerUser = MIN(CEIL(10/3), 4) = MIN(4, 4) = 4 leads per user

Distribution:
- Alice: 4 leads
- Bob: 4 leads
- Charlie: 2 leads (remainder)

Next cycle starts with Charlie (continuing round-robin)
```

---

## 📊 Data Flow

### Input: What the Scheduler Reads

```javascript
// From superadmin database (leadrabbit_superadmin)
customers = [
  {
    customerName: "Vijaya Ventures",
    databaseName: "leadrabbit_vijaya_ventures_1770448298991",
    status: "active"
  },
  ...
]

// From each customer database
users = [
  {
    email: "user@example.com",
    isOnline: true,
    isVerified: true
  },
  ...
]

leads = [
  {
    name: "John Doe",
    email: "john@gmail.com",
    assignedTo: null  // ← This lead will be assigned
  },
  ...
]
```

### Output: What the Scheduler Writes

```javascript
// Updates in customer database
leads = [
  {
    name: "John Doe",
    email: "john@gmail.com",
    assignedTo: "user@example.com",  // ← NOW ASSIGNED
    assignedAt: ISODate("2026-02-07T10:30:00Z")
  },
  ...
]

settings = [
  {
    name: "leadAssignment",
    lastAssignedIndex: 1,
    lastAssignedUser: "bob@example.com",
    lastAssignedAt: ISODate("2026-02-07T10:30:00Z")
  }
]
```

---

## 🔍 Detailed Function Breakdown

### startCron() - Scheduler Entry Point

**Location:** `lib/scheduler.js` line 150

**What it does:**
1. Logs beautiful startup banner with configuration
2. Runs `assignLeads()` IMMEDIATELY on startup
3. Creates cron job using pattern `*/10 * * * *`
4. Logs results after each execution
5. Returns the task object

**Output Example:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║                  🚀 LEAD ASSIGNMENT SCHEDULER                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

📅 Start Time: 2/7/2026, 4:00:00 PM IST
📍 Function: startCron()
📂 File: lib/scheduler.js
🌎 Environment: production
🔄 Schedule Pattern: */10 * * * * (Every 10 minutes)

▶️  [INITIAL RUN] Executing first lead assignment immediately...
[Vijaya Ventures] Assigning 2 leads per user to 3 online users (6 unassigned leads)
[Vijaya Ventures] ✅ Assigned 4 leads successfully
✅ [INITIAL RUN] First assignment completed successfully

🎯 [CRON SETUP] Scheduler configuration:
   • Frequency: Every 10 minutes
   • Pattern: */10 * * * * (minute hour day month weekday)
   • Continuous: Yes (runs 24/7 while app is running)
   • Next execution: Within 10 minutes
   • Timezone: Asia/Kolkata (IST)
   • Status: ✅ Active

✅ [CRON READY] Lead assignment scheduler is now ACTIVE and RUNNING
📡 Waiting for next execution cycle...
```

### assignLeads() - Fetch & Orchestrate

**Location:** `lib/scheduler.js` line 5

**What it does:**
1. Connects to MongoDB
2. Gets super admin database
3. Fetches all ACTIVE customers
4. For each customer, calls `assignLeadsForCustomer()`

**Pseudo-code:**
```javascript
async function assignLeads() {
  const client = connect_to_mongodb()
  const superAdminDb = get_superadmin_db()
  const activeCustomers = find({ status: "active" })
  
  for each customer:
    const db = client.db(customer.databaseName)
    await assignLeadsForCustomer(db, customer.customerName)
}
```

### assignLeadsForCustomer() - Core Logic

**Location:** `lib/scheduler.js` line 35

**What it does:**
1. Fetch online, verified users
2. Fetch unassigned leads
3. Calculate leads per user (max 4)
4. Distribute using round-robin algorithm
5. Update pointer for next cycle
6. Log assignment results

**Key Variables:**
```javascript
leadsPerUser = Math.min(
  Math.ceil(unassignedLeads.length / onlineUsers.length),
  4
)

lastIndex = settings.lastAssignedIndex ?? -1
userIndex = decide_starting_position()

for each lead to assign:
  user = onlineUsers[userIndex]
  lead.assignedTo = user.email
  lead.assignedAt = new Date()
  
  if assigned all leads for this user:
    userIndex = (userIndex + 1) % onlineUsers.length
```

---

## 🎮 Manual Triggers

### Via API Endpoint

**Restart the cron job:**
```bash
GET /api/leads/cronJob
```

**Run assignment immediately (without restarting cron):**
```bash
GET /api/leads/cronJob?action=run
```

**Response:**
```json
{
  "message": "Lead assignment executed manually",
  "timestamp": "2026-02-07T16:30:00.000Z"
}
```

### Via Function Call

**In code:**
```javascript
import { assignLeadsManually } from '@/lib/scheduler'

await assignLeadsManually()
```

**Console output:**
```
🔧 Manual lead assignment triggered
[Customer Name] Assigning X leads per user to Y online users...
[Customer Name] ✅ Assigned Z leads successfully
```

---

## 📋 Execution Timeline

### On App Startup
```
T=0ms     → instrumentation.ts runs (EARLIEST)
T=5ms     → startCron() called
T=10ms    → First assignLeads() begins
T=50ms    → First cycle completes
T=100ms   → app/layout.tsx loads
T=150ms   → initScheduler.ts runs (but already initialized)
T=200ms   → Cron is ACTIVE and waiting
T=600s    → First scheduled cron tick (10 minutes)
T=1200s   → Second scheduled cron tick (20 minutes)
T=1800s   → Third scheduled cron tick (30 minutes)
...continuing every 10 minutes forever...
```

---

## ⚙️ Configuration

### Change Frequency

Edit `lib/scheduler.js` line 175:

**Current (every 10 minutes):**
```javascript
cron.schedule("*/10 * * * *", ...)
```

**Alternative Patterns:**

| Pattern | Frequency |
|---------|-----------|
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |
| `0 9-17 * * *` | Every hour 9am-5pm |
| `*/10 9-17 * * 1-5` | Every 10 min (9-5, weekdays only) |

### Change Max Leads Per User

Edit `lib/scheduler.js` line 58:

**Current (max 4 leads per cycle):**
```javascript
const leadsPerUser = Math.min(
  Math.ceil(unassignedLeads.length / onlineUsers.length),
  4  // ← Change this number
)
```

### Change Timezone

Edit `lib/scheduler.js` lines 154, 167, 169:

**Current (Asia/Kolkata):**
```javascript
now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
```

**Alternative:**
```javascript
'America/New_York'    // EST
'Europe/London'       // GMT
'Asia/Tokyo'          // JST
'Australia/Sydney'    // AEDT
```

---

## 🐛 Troubleshooting

### Scheduler Not Running

**Check:** App startup logs should show:
```
🚀 [SCHEDULER INIT] Auto-initialization triggered
📦 [SCHEDULER INIT] Initializing Lead Assignment Scheduler
🔥 [INSTRUMENTATION] Calling startCron()
✅ [CRON READY] Lead assignment scheduler is now ACTIVE
```

**If missing:** Restart the Next.js server

### Leads Not Assigning

**Check 1:** Are there online users?
```javascript
db.users.find({ isOnline: true, isVerified: true })
```

**Check 2:** Are users verified?
```javascript
db.users.find({ isVerified: false })
```

**Check 3:** Are there unassigned leads?
```javascript
db.leads.find({ $or: [{ assignedTo: "" }, { assignedTo: null }] })
```

**Check 4:** Is the customer active?
```javascript
db.customers.find({ status: "active" })
```

### Cron Running Too Frequently

**Solution:** Increase the frequency pattern in `lib/scheduler.js`

### Cron Not Logging Output

**Solution:** Check app logs in your hosting platform (Render, Vercel, etc.)

---

## 🔐 Security Notes

- ✅ Only processes **verified users** (`isVerified: true`)
- ✅ Only processes **online users** (`isOnline: true`)
- ✅ Only processes **active customers** (`status: "active"`)
- ✅ Uses **round-robin** to prevent bias toward first user
- ✅ **Persistent pointer** ensures fairness across cycles
- ✅ **Rate limited** to max 4 leads per user per cycle

---

## 📊 Logging & Monitoring

### What Gets Logged

**On Startup:**
```
Scheduler configuration
Time zone
Schedule pattern
Initial run result
Cron status
```

**Every 10 Minutes:**
```
Cron trigger time
Number of customers processed
Leads assigned per customer
Number of online users
Completion time
Success/error status
```

**On Errors:**
```
Error message
Failed operation
Customer (if applicable)
Stack trace
```

### Log Format

All logs use consistent formatting with emoji prefixes:

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🚀 | Startup/init | `🚀 [SCHEDULER INIT]` |
| ⏰ | Time/schedule | `⏰ [CRON TRIGGERED]` |
| 🔄 | Process running | `🔄 [CRON] Running every 10 min` |
| ✅ | Success | `✅ [CRON READY]` |
| ❌ | Error | `❌ [CRON ERROR]` |
| 📊 | Statistics | `📊 Updated lead count` |
| ⚠️ | Warning | `⚠️ Already started` |

---

## 🚀 Performance Considerations

### Resource Usage

- **CPU:** Minimal (< 5% per cycle)
- **Memory:** ~10-20 MB per cycle
- **Database Calls:** 
  - 1 query for active customers
  - 2 queries per customer (users + leads)
  - 1-2 updates per customer (leads + settings)
- **Network:** Internal DB only

### Optimization Tips

1. **Index these fields** for faster queries:
   ```javascript
   db.users.createIndex({ isOnline: 1, isVerified: 1 })
   db.leads.createIndex({ assignedTo: 1 })
   db.settings.createIndex({ name: 1 })
   ```

2. **Reduce frequency** if database is slow
   ```javascript
   "*/15 * * * *"  // Change from 10 to 15 minutes
   ```

3. **Filter by timestamp** to avoid old leads
   ```javascript
   leads.find({
     assignedTo: null,
     createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
   })
   ```

---

## 📚 Related Documentation

- [USER_MANAGEMENT.md](USER_MANAGEMENT.md) - User online status tracking
- [LEAD_MANAGEMENT.md](LEAD_MANAGEMENT.md) - Lead assignment workflow
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Collection structure
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Production setup

---

## 🔗 External Dependencies

```json
{
  "node-cron": "^3.0.0",  // Cron scheduling
  "mongodb": "^5.x.x"     // Database access
}
```

---

**Last Updated:** February 7, 2026
**Status:** ✅ Active & Tested
**Author:** LeadRabbit Development Team
