# Email Uniqueness Implementation

## Problem Statement
In a multi-tenant system, if two different customers have the same email address (e.g., both Customer A and Customer B have `admin@company.com`), the authentication system would log the user into the FIRST customer database found, creating a serious security vulnerability.

## Solution: Global Email Uniqueness
We enforce **globally unique emails** across the entire system. No email can be used by more than one customer or user, regardless of which customer database they belong to.

## Implementation Details

### 1. Core Function: `isEmailTaken()`
**Location:** `lib/multitenancy.ts`

This function checks if an email exists anywhere in the system:
- Checks if email is used as `adminEmail` in the customers collection
- Iterates through all active customer databases
- Queries the `users` collection in each customer database
- Returns `true` if email found anywhere, `false` otherwise

```typescript
export async function isEmailTaken(email: string): Promise<boolean> {
  try {
    const customersCollection = await getCustomersCollection();
    
    // Check if email is used as admin email
    const customerWithEmail = await customersCollection.findOne({ 
      adminEmail: email 
    });
    
    if (customerWithEmail) {
      return true;
    }
    
    // Check all customer databases for user emails
    const allCustomers = await customersCollection
      .find({ status: "active" })
      .toArray();
    
    const client = await clientPromise;
    if (!client) return false;
    
    for (const customer of allCustomers) {
      const db = client.db(customer.databaseName);
      const usersCollection = db.collection("users");
      
      const user = await usersCollection.findOne({ email });
      if (user) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking if email is taken:", error);
    return false;
  }
}
```

### 2. Customer Creation Validation
**Location:** `lib/multitenancy.ts` - `createCustomer()` function

Before creating a new customer, we validate that the admin email is not already in use:

```typescript
// Check if email is already taken
const emailTaken = await isEmailTaken(adminEmail);
if (emailTaken) {
  throw new Error("This email is already in use. Please use a different email.");
}
```

**Affected endpoint:** `/api/superadmin/customers`

### 3. User Creation Validation
**Location:** `app/api/admin/addUser/route.ts`

When an admin creates a new user/employee in their customer database, we check global uniqueness:

```typescript
// Check if email already exists across all customers (global uniqueness)
const emailTaken = await isEmailTaken(email);

if (emailTaken) {
  return NextResponse.json(
    { error: "This email is already in use. Please use a different email." },
    { status: 400 },
  );
}
```

### 4. Email Availability Check API
**Location:** `app/api/check-email/route.ts`

Frontend helper endpoint to check email availability before form submission:

```typescript
POST /api/check-email
{
  "email": "test@example.com"
}

Response:
{
  "taken": false,
  "available": true
}
```

## Benefits

1. **Security**: Prevents users from accidentally accessing wrong customer data
2. **Data Isolation**: Maintains strict tenant separation
3. **User Experience**: Clear error messages when email is already in use
4. **Consistency**: Same email = same user across the entire platform

## Usage

### For Super Admin (Creating Customers)
- Enter unique admin email for each customer
- System validates globally before creating customer database
- Error message if email already exists anywhere

### For Customer Admin (Creating Users)
- Enter unique email for each new user/employee
- System validates across all customer databases
- Error message if email is taken by any customer

## Future Considerations

1. **Database Indexes**: Add unique index on email field in customers collection
2. **Bulk Validation**: For importing multiple users, validate all emails in batch
3. **Email Change**: If implementing email change feature, revalidate with `isEmailTaken()`
4. **Performance**: Consider caching or indexing strategy for very large number of customers

## Testing Checklist

- [ ] Create customer with unique email → Success
- [ ] Create customer with duplicate email → Error
- [ ] Create user with unique email → Success  
- [ ] Create user with existing admin email → Error
- [ ] Create user with email from another customer → Error
- [ ] Check `/api/check-email` endpoint returns correct availability

## Related Files

- `lib/multitenancy.ts` - Core validation logic
- `app/api/superadmin/customers/route.ts` - Customer creation
- `app/api/admin/addUser/route.ts` - User creation
- `app/api/check-email/route.ts` - Email availability check
