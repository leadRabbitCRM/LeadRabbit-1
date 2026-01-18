# Multi-Tenant Setup Scripts

This folder contains helper scripts for setting up and managing the multi-tenant LeadRabbit system.

## Available Scripts

### 1. `init-superadmin.js`

**Purpose**: Initialize the super admin database and create your first super admin user.

**Usage**:
```bash
node scripts/init-superadmin.js
```

**What it does**:
- Creates `leadrabbit_superadmin` database
- Creates `super_admins` and `customers` collections
- Sets up required indexes
- Creates your first super admin user account
- Provides the login URL

**When to use**:
- First time setup
- Creating additional super admin users

**Interactive prompts**:
- MongoDB URI (or uses MONGODB_URI from .env.local)
- Email address
- Name
- Password (minimum 6 characters)

---

### 2. `migrate-existing-data.js`

**Purpose**: Migrate data from your old single-tenant database to a customer database in the new multi-tenant system.

**Usage**:
```bash
node scripts/migrate-existing-data.js
```

**Prerequisites**:
1. Super admin must be created (run `init-superadmin.js` first)
2. Customer must be created via super admin dashboard

**What it does**:
- Connects to your MongoDB cluster
- Copies data from old database to new customer database
- Migrates these collections:
  - users
  - employees
  - leads
  - meta_pages
  - meta_leads
  - meetings
  - settings
- Provides detailed migration summary

**Interactive prompts**:
- MongoDB URI
- Old database name (e.g., "leadRabbit")
- New customer database name (from super admin dashboard)
- Confirmation for each collection with existing data

**Safety features**:
- Asks for confirmation before migrating
- Warns if destination collections have existing data
- Allows skipping collections
- Provides detailed summary of what was migrated

---

## Setup Workflow

### For New Installation:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables in .env.local
# MONGODB_URI, JWT_SECRET, etc.

# 3. Initialize super admin
node scripts/init-superadmin.js

# 4. Start the app
npm run dev

# 5. Access super admin dashboard and create customers
# URL: http://localhost:4000/superadmin/{hash}
```

### For Existing Installation (Migration):

```bash
# 1. Initialize super admin
node scripts/init-superadmin.js

# 2. Start the app
npm run dev

# 3. Login to super admin dashboard
# Create your first customer

# 4. Stop the app (Ctrl+C)

# 5. Migrate existing data
node scripts/migrate-existing-data.js

# 6. Start the app again
npm run dev

# 7. Login as customer admin and verify data
```

---

## Environment Variables Required

Make sure these are set in your `.env.local`:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
SUPERADMIN_SETUP_KEY=your_setup_key
```

---

## Troubleshooting

### Script can't connect to MongoDB

**Problem**: "MongoDB connection error"

**Solution**: 
- Verify MONGODB_URI in .env.local is correct
- Check MongoDB Atlas network access settings
- Ensure IP address is whitelisted

### Super admin already exists

**Problem**: "Super admin already exists"

**Solution**:
- This is normal if you've already run the script
- You can create additional super admins when prompted
- Or use the existing super admin to login

### Customer database not found

**Problem**: "Customer database not found" during migration

**Solution**:
- Make sure you created the customer via super admin dashboard first
- Copy the exact database name from the super admin dashboard
- The database name format is: `leadrabbit_{customer_name}_{timestamp}`

### Duplicate key error during migration

**Problem**: "E11000 duplicate key error"

**Solution**:
- Some documents already exist in the destination
- Choose to skip the collection or manually handle duplicates
- Check if you've run the migration before

---

## Safety Notes

⚠️ **Important**:

1. **Backup your data** before running migrations
2. **Test migrations** on a staging/development database first
3. **Don't delete** old database until you've verified the migration
4. **Keep super admin credentials** secure - they have full access
5. **Run scripts** during low-traffic periods if migrating production data

---

## Support

For detailed documentation, see:
- `QUICK_START.md` - Quick setup guide
- `MULTI_TENANT_SETUP.md` - Comprehensive architecture documentation

---

Happy multi-tenanting! 🚀
