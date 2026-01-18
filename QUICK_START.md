# 🚀 Quick Start Guide - Multi-Tenant LeadRabbit

## ⚡ Quick Setup (5 Minutes)

### Method 1: Using the Setup Script (Recommended)

1. **Install dependencies** (if not already done):
```bash
npm install
```

2. **Run the super admin initialization script**:
```bash
node scripts/init-superadmin.js
```

3. **Follow the prompts**:
   - Enter your MongoDB URI (or it will use MONGODB_URI from .env.local)
   - Enter super admin email
   - Enter super admin name
   - Enter password (minimum 6 characters)

4. **Save the login URL** that appears:
```
http://localhost:4000/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
```

### Method 2: Using API (Alternative)

1. **Start your Next.js app**:
```bash
npm run dev
```

2. **Create super admin via API**:
```bash
curl -X POST http://localhost:4000/api/superadmin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "name": "Super Admin",
    "password": "SecurePassword123",
    "setupKey": "CHANGE_THIS_KEY_IN_PRODUCTION_LeadRabbit2026"
  }'
```

**Note**: The `setupKey` is from your `.env.local` file: `SUPERADMIN_SETUP_KEY`

## 🎯 Usage Flow

### Step 1: Login as Super Admin

1. Navigate to:
```
http://localhost:4000/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
```

2. Login with your super admin credentials

3. You'll see the Super Admin Dashboard

### Step 2: Create Your First Customer

1. Click **"Create New Customer"** button
2. Fill in the form:
   ```
   Customer Name: ACME Corporation
   Admin Email: admin@acme.com
   Admin Password: acme123456
   Company Name: ACME Corporation Inc.
   Phone: +1234567890
   Address: 123 Business Street
   ```
3. Click **"Create Customer"**

4. The system automatically:
   - ✅ Creates database: `leadrabbit_acme_corporation_1234567890`
   - ✅ Creates collections: users, leads, employees, etc.
   - ✅ Creates admin user account
   - ✅ Sets up indexes for performance

### Step 3: Customer Admin Login

1. Open a new browser tab (or incognito window)
2. Go to regular login page:
```
http://localhost:4000/login
```

3. Login with customer admin credentials:
   ```
   Email: admin@acme.com
   Password: acme123456
   ```

4. You'll be redirected to `/admin` dashboard

5. **All data is isolated!** This admin can only see their own company's data

### Step 4: Create Users for Customer

As the customer admin:

1. Go to **Employees** section
2. Add new users for this customer
3. Each user can login via `/login` and see only their customer's data

## 🔐 Important URLs & Credentials

### Super Admin Access
```
URL: /superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
Role: superadmin
Access: Manage all customers
```

### Customer Admin/User Access
```
URL: /login
Role: admin or user
Access: Only their customer's data
```

## 🗄️ Database Structure After Setup

```
MongoDB Cluster
│
├── leadrabbit_superadmin          (Central management)
│   ├── super_admins               (Super admin accounts)
│   └── customers                  (Customer records)
│
├── leadrabbit_acme_corporation_xxx (Customer 1)
│   ├── users
│   ├── leads
│   ├── employees
│   └── ... (all other collections)
│
├── leadrabbit_beta_company_yyy    (Customer 2)
│   ├── users
│   ├── leads
│   └── ...
│
└── ... (more customer databases)
```

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Super admin can login via secret URL
- [ ] Super admin dashboard shows no customers initially
- [ ] Can create a test customer successfully
- [ ] Customer admin can login via regular /login
- [ ] Customer admin sees empty leads list (no existing data)
- [ ] Customer admin can create users
- [ ] Customer admin can create leads
- [ ] Second customer's admin cannot see first customer's data

## 🔧 Configuration Files

### Files Modified for Multi-Tenancy:

1. **`lib/multitenancy.ts`** - Core multi-tenant functions
2. **`app/api/authenticate/route.ts`** - Multi-tenant login
3. **`app/api/_utils/auth.ts`** - Multi-tenant auth resolver
4. **`middleware.ts`** - Super admin route protection
5. **`app/superadmin/[hash]/page.tsx`** - Super admin login UI
6. **`app/superadmin/[hash]/dashboard/page.tsx`** - Super admin dashboard
7. **`.env.local`** - Added super admin configuration

### New API Endpoints:

- `POST /api/superadmin/auth` - Super admin login
- `POST /api/superadmin/setup` - Initial setup (one-time use)
- `POST /api/superadmin/customers` - Create customer
- `GET /api/superadmin/customers/list` - List customers
- `PATCH /api/superadmin/customers/list` - Update customer status

## 🐛 Common Issues & Solutions

### Issue: "Super admin database unavailable"
**Solution**: Check MongoDB connection string in `.env.local`

### Issue: "Cannot access super admin login"
**Solution**: Make sure you're using the complete URL with the hash:
```
/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
```

### Issue: "Customer already exists"
**Solution**: Each customer needs a unique admin email

### Issue: Regular login not working
**Solution**: Make sure the customer status is "active" in super admin dashboard

### Issue: "Database unavailable" for customer
**Solution**: Verify the customer database was created successfully in MongoDB Atlas

## 🎨 Features Overview

### Super Admin Can:
- ✅ View all customers
- ✅ Create new customers
- ✅ Activate/suspend customers
- ✅ View customer statistics
- ✅ Manage customer access

### Customer Admin Can:
- ✅ Manage their users
- ✅ View their leads
- ✅ Create employees
- ✅ Configure settings
- ✅ Access Meta integrations
- ❌ Cannot see other customers' data

### Customer User Can:
- ✅ View their assigned leads
- ✅ Update lead status
- ✅ Create meetings
- ❌ Cannot access admin features
- ❌ Cannot see other customers' data

## 📊 Testing Multi-Tenancy

### Test Data Isolation:

1. **Create Customer A**:
   ```
   Name: Company A
   Email: admin@companya.com
   Password: password123
   ```

2. **Login as Company A admin** → Create some leads

3. **Create Customer B**:
   ```
   Name: Company B
   Email: admin@companyb.com
   Password: password456
   ```

4. **Login as Company B admin** → Verify you don't see Company A's leads ✅

5. **Switch back to Company A** → Verify data is still there ✅

## 🚀 Production Deployment

Before deploying to production:

1. **Change the super admin setup key** in `.env.local`:
```env
SUPERADMIN_SETUP_KEY=your-very-secure-random-key-here
```

2. **Secure the super admin hash** - Consider changing it:
```typescript
// In middleware.ts
const SUPER_ADMIN_HASH = "your-new-secure-hash-here";
```

3. **Set strong passwords** for super admin accounts

4. **Enable MongoDB Atlas IP whitelist** for production

5. **Use environment variables** for all sensitive data

## 📞 Need Help?

- Review the detailed documentation: `MULTI_TENANT_SETUP.md`
- Check MongoDB connection logs
- Verify all environment variables are set
- Test API endpoints individually

---

**🎉 You're all set!** Your LeadRabbit app is now multi-tenant!

Happy customer onboarding! 🚀
