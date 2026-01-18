# Multi-Tenant Architecture Setup Guide

## 🏗️ Architecture Overview

Your LeadRabbit application has been successfully transformed into a **multi-tenant system** where:

- **One Super Admin** manages multiple customers
- **Each customer** has their own isolated database
- **Each customer** can have their own admins and users
- **Data isolation** ensures customers cannot access each other's data

## 📊 Database Structure

### Super Admin Database: `leadrabbit_superadmin`

This central database manages all customers and super admins.

**Collections:**
- `super_admins` - Super administrator accounts
- `customers` - Customer organizations and their database mappings

### Customer Databases: `leadrabbit_{customer_name}_{timestamp}`

Each customer gets a dedicated database with these collections:
- `users` - Admin and user accounts
- `employees` - Employee profiles
- `leads` - Customer leads
- `meta_pages` - Facebook/Instagram pages
- `meta_leads` - Meta platform leads
- `meetings` - Calendar meetings
- `settings` - Application settings

## 🚀 Initial Setup

### Step 1: Initialize Super Admin Database

Run the initialization script to create the super admin database and your first super admin user:

```bash
node scripts/init-superadmin.js
```

This will:
1. Create the `leadrabbit_superadmin` database
2. Create required collections and indexes
3. Prompt you to create the first super admin user

**Example:**
```
Email: superadmin@leadrabbit.com
Name: Super Admin
Password: YourSecurePassword123
```

### Step 2: Access Super Admin Portal

The super admin login is protected by a unique hash URL:

```
https://yourdomain.com/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
```

**Important:** 
- This hash is hardcoded in `middleware.ts` and `.env.local`
- Only those who know this URL can access the super admin login page
- Keep this URL secret and secure

### Step 3: Create Your First Customer

1. Login to the super admin portal
2. Click "Create New Customer"
3. Fill in the details:
   - **Customer Name**: Company/Organization name
   - **Admin Email**: Primary admin email
   - **Admin Password**: Password for the admin user
   - **Additional Info**: Company details (optional)

4. Click "Create Customer"

The system will automatically:
- Create a new dedicated database for the customer
- Set up all required collections and indexes
- Create the admin user account in the customer database
- Store the customer mapping in the super admin database

## 👥 User Access Flow

### Super Admin Login

1. Access: `/superadmin/{hash}`
2. Login with super admin credentials
3. Redirects to: `/superadmin/{hash}/dashboard`

### Customer Admin/User Login

1. Access: `/login` (regular login page)
2. Login with admin or user email
3. System automatically:
   - Looks up which customer database the user belongs to
   - Authenticates against the correct customer database
   - Adds customer context to the JWT token
4. Redirects to: `/admin` or `/user` based on role

## 🔐 Authentication & Authorization

### JWT Token Structure

**Super Admin:**
```json
{
  "email": "superadmin@example.com",
  "role": "superadmin"
}
```

**Customer Admin/User:**
```json
{
  "email": "admin@customer.com",
  "role": "admin",
  "customerId": "cust_1234567890_abc123",
  "dbName": "leadrabbit_customer_1234567890"
}
```

### Middleware Protection

- `/superadmin/*` - Requires super admin role and correct hash
- `/admin/*` - Requires admin role and valid customer context
- `/user/*` - Requires user role and valid customer context

## 🗄️ Multi-Tenancy Functions

Located in `lib/multitenancy.ts`:

### Core Functions

```javascript
// Get super admin database
const superAdminDb = await getSuperAdminDb();

// Get customer database by customer ID
const customerDb = await getCustomerDb(customerId);

// Get customer database by user email
const result = await getCustomerDbByEmail(email);
// Returns: { db, customer }

// Create new customer
const result = await createCustomer(
  customerName,
  adminEmail,
  adminPassword,
  metadata
);

// Initialize customer database with collections
await initializeCustomerDatabase(databaseName);

// Get all customers
const customers = await getAllCustomers();

// Update customer status
await updateCustomerStatus(customerId, "active" | "inactive" | "suspended");
```

## 🔄 Migration from Single-Tenant

### Current Data Migration

If you have existing data in a single database, you need to migrate it:

1. **Identify your current database** (probably `leadRabbit` from DB_NAME)
2. **Create your first customer** via super admin
3. **Migrate existing data** to the new customer database:

```javascript
// Migration script example
const { MongoClient } = require("mongodb");

async function migrateExistingData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const oldDb = client.db("leadRabbit"); // Your old database
  const newDb = client.db("leadrabbit_customer_xxx"); // New customer database
  
  // Copy collections
  const collections = ["users", "leads", "employees", "meetings", "settings"];
  
  for (const collName of collections) {
    const data = await oldDb.collection(collName).find({}).toArray();
    if (data.length > 0) {
      await newDb.collection(collName).insertMany(data);
      console.log(`Migrated ${data.length} documents from ${collName}`);
    }
  }
  
  await client.close();
}
```

## 📝 API Endpoints

### Super Admin APIs

```
POST   /api/superadmin/auth              - Super admin login
POST   /api/superadmin/customers         - Create new customer
GET    /api/superadmin/customers/list    - List all customers
PATCH  /api/superadmin/customers/list    - Update customer status
```

### Customer APIs (Multi-tenant)

All existing APIs now work with multi-tenancy:

```
POST   /api/authenticate                  - Customer admin/user login
GET    /api/me                            - Get current user info
GET    /api/admin/users                   - Get users (customer-specific)
GET    /api/leads/getAllLeads             - Get leads (customer-specific)
...
```

The `resolveAuthenticatedUser()` function in `/api/_utils/auth.ts` automatically:
1. Extracts customer ID from JWT token
2. Retrieves the correct customer database
3. Ensures data isolation

## 🔒 Security Features

1. **URL-based Super Admin Protection**: Secret hash in URL prevents unauthorized access
2. **Database Isolation**: Each customer has completely separate database
3. **JWT Token Verification**: Tokens include customer context
4. **Middleware Guards**: Role and customer validation on every request
5. **Password Hashing**: bcrypt with 10 rounds

## 🎨 UI Components

### Super Admin Dashboard Features

- **Statistics Cards**: Total customers, active customers, databases
- **Customer Table**: View all customers with status
- **Create Customer Modal**: Comprehensive onboarding form
- **Status Management**: Activate/suspend customers
- **Beautiful UI**: Gradient backgrounds, HeroUI components

### Customer Management

- View customer details
- Manage customer status (active/inactive/suspended)
- Track creation dates
- Store additional metadata

## ⚙️ Environment Variables

Add to your `.env.local`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://...

# JWT Secret
JWT_SECRET=your_jwt_secret

# Super Admin Hash (already in your .env.local)
# This is used in middleware.ts
SuperAdmin=$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2
```

## 🧪 Testing the System

### Test Super Admin

1. Run init script: `node scripts/init-superadmin.js`
2. Access: `http://localhost:4000/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2`
3. Login with created credentials
4. Create a test customer

### Test Customer Login

1. Create a customer via super admin
2. Note the admin email and password
3. Go to regular login: `http://localhost:4000/login`
4. Login with customer admin credentials
5. Should redirect to `/admin` dashboard

### Test Data Isolation

1. Create two customers
2. Login as admin for Customer A, create some leads
3. Logout and login as admin for Customer B
4. Verify you cannot see Customer A's leads

## 📚 Code Structure

```
lib/
  └── multitenancy.ts              - Multi-tenant helper functions

app/
  ├── api/
  │   ├── authenticate/route.ts    - Updated for multi-tenancy
  │   ├── _utils/auth.ts           - Updated auth resolver
  │   └── superadmin/
  │       ├── auth/route.ts        - Super admin login
  │       └── customers/
  │           ├── route.ts         - Create customer
  │           └── list/route.ts    - List/update customers
  │
  ├── superadmin/
  │   └── [hash]/
  │       ├── page.tsx             - Super admin login page
  │       └── dashboard/
  │           └── page.tsx         - Super admin dashboard
  │
  ├── admin/                       - Customer admin pages (existing)
  └── user/                        - Customer user pages (existing)

middleware.ts                      - Updated for super admin routes
scripts/
  └── init-superadmin.js           - Super admin initialization
```

## 🐛 Troubleshooting

### Cannot access super admin login

- Verify you're using the correct hash in the URL
- Check `middleware.ts` has the correct SUPER_ADMIN_HASH
- Clear browser cookies and try again

### Customer login fails

- Verify customer exists in super admin database
- Check customer status is "active"
- Verify user exists in customer's database
- Check MongoDB connection string

### Database not created

- Ensure MongoDB user has permissions to create databases
- Check MongoDB Atlas settings allow database creation
- Verify network access settings in MongoDB Atlas

## 🔄 Next Steps

1. **Run the initialization script** to create your super admin
2. **Access the super admin portal** using the secret URL
3. **Create your first customer** organization
4. **Migrate existing data** if you have any
5. **Test the system** with multiple customers
6. **Update deployment** configuration if needed

## 📞 Support

- Check MongoDB connection in MongoDB Atlas dashboard
- Review logs in terminal for error messages
- Verify all environment variables are set correctly
- Test API endpoints using tools like Postman

---

**🎉 Congratulations!** Your LeadRabbit app is now multi-tenant capable!
