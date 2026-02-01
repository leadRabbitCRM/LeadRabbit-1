# New User Onboarding Flow - Default Password Reset & MFA Setup

## Overview
Implemented a complete onboarding flow for newly added users/admins. When a user/admin logs in with the default password `LeadRabbit@123`, they are guided through:
1. **Password Reset** - Must create a new secure password
2. **MFA Setup** - Must configure two-factor authentication 
3. **Login** - Final authentication with new credentials

This matches the customer onboarding flow that was previously implemented.

---

## Implementation Details

### 1. **API: `/api/admin/addUser` (POST)**
**File**: [app/api/admin/addUser/route.ts](app/api/admin/addUser/route.ts)

**Changes Made**:
- Added `passwordChanged: false` flag to new user object
- This flag signals that the user must change their password on first login

```typescript
const newUser = {
  // ... other fields
  passwordChanged: false,  // Force password change on first login
  // ... rest of fields
};
```

---

### 2. **API: `/api/authenticate` (POST)**
**File**: [app/api/authenticate/route.ts](app/api/authenticate/route.ts)

**Changes Made**: Added three new detection steps in the authentication flow:

#### Step 1: Detect Default Password Usage
```typescript
// Check if user logged in with default password (first login for new user)
const DEFAULT_PASSWORD = "LeadRabbit@123";
const isDefaultPassword = bcrypt.compareSync(DEFAULT_PASSWORD, user.password);

if (isDefaultPassword && !user.passwordChanged) {
  return NextResponse.json({
    requiresPasswordReset: true,
    email: user.email,
    role: user.role,
    message: "Welcome! You are logging in with the default password...",
    isFirstLoginWithDefault: true
  });
}
```

**Response**: User is redirected to password reset page on login

#### Step 2: Force MFA Setup After Password Change
```typescript
// After password change from default, force MFA setup for new users
if (user.passwordChanged && !user.totpEnabled && !user.totpSecret) {
  const secret = speakeasy.generateSecret({
    name: `LeadRabbit (${user.email})`,
    issuer: 'LeadRabbit',
  });

  await usersCollection.updateOne(
    { email: lowerEmail },
    { $set: { totpSecret: secret.base32 } }
  );

  return NextResponse.json({
    requiresTotpSetup: true,
    totpSecret: secret.base32,
    message: "Please set up two-factor authentication..."
  });
}
```

**Response**: After password is changed, user sees MFA setup page with QR code

---

### 3. **API: `/api/user/change-password` (POST)**
**File**: [app/api/user/change-password/route.ts](app/api/user/change-password/route.ts)

**Changes Made**:
- Added `passwordChanged: true` flag when password is successfully changed
- This allows the next login attempt to check for MFA setup requirement

```typescript
await usersCollection.updateOne(
  { email: lowerEmail },
  {
    $set: {
      password: hashedPassword,
      passwordChanged: true,  // Mark password as changed
      updatedAt: now,
    },
    $unset: {
      passwordResetRequired: "",
      isFreshAccount: "",
    },
  }
);
```

---

## Complete User Journey

### For Newly Added User/Admin:

```
┌─────────────────────────────────────┐
│   Admin Creates New User/Admin      │
│   Password: LeadRabbit@123          │
│   passwordChanged: false             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   User Attempts Login               │
│   Email: new_user@example.com       │
│   Password: LeadRabbit@123          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Authenticate API Detects:         │
│   - Default password used ✓         │
│   - passwordChanged: false ✓        │
│   ⚠️  FORCES PASSWORD RESET         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Login Page: Password Reset Step   │
│   1. Enter new secure password      │
│   2. Confirm password               │
│   3. Click "Set Password"           │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   API: /user/change-password        │
│   - Hash new password               │
│   - Set passwordChanged: true       │
│   - Clear passwordResetRequired     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Login Page Auto-Authenticates     │
│   with New Password                 │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Authenticate API Detects:         │
│   - New password provided ✓         │
│   - passwordChanged: true ✓         │
│   - No TOTP setup yet               │
│   ⚠️  FORCES MFA SETUP              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Login Page: MFA Setup Step        │
│   1. Show QR code                   │
│   2. User scans with authenticator  │
│   3. User enters 6-digit code       │
│   4. Click "Verify & Complete"      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Authenticate API Verifies:        │
│   - TOTP token valid ✓              │
│   - Sets totpEnabled: true          │
│   - Creates JWT token               │
│   ✓ SUCCESSFUL LOGIN                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   User Logged In Successfully       │
│   Ready to Use LeadRabbit           │
└─────────────────────────────────────┘
```

---

## User Flags & States

| Flag | Purpose | Set By | Cleared When |
|------|---------|--------|--------------|
| `passwordChanged` | Tracks if password has been changed from default | addUser (false) | change-password (true) |
| `passwordResetRequired` | Admin-initiated password reset | admin action | change-password |
| `totpSecret` | Temporary TOTP secret during setup | authenticate | totp-setup complete |
| `totpEnabled` | Marks MFA as active/verified | authenticate (TOTP verification) | - |
| `isFreshAccount` | Legacy flag for initial onboarding | - | Deprecated in favor of passwordChanged |

---

## Authentication Flow Decisions

The authenticate API checks in this order:

```
1. Valid credentials? NO → Error (401)
2. Using default password? YES → Force password reset
3. Admin reset password flag set? YES → Force password reset  
4. Password changed but no MFA? YES → Force MFA setup
5. Admin manually reset MFA? YES → Force MFA setup
6. Fresh account? YES → Allow login (MFA optional)
7. MFA required? YES → Ask for TOTP token
8. All good? YES → Create JWT & login ✓
```

---

## Login Page Integration

The [app/login/page.jsx](app/login/page.jsx) already handles these flows with `loginStep` state:

```javascript
const [loginStep, setLoginStep] = React.useState('credentials');
// Possible values:
// - 'credentials': Normal login form
// - 'password-reset': Change password form
// - 'totp-setup': QR code & manual entry
// - 'totp-verify': 6-digit code entry
```

---

## Testing the Flow

### Test Scenario: New Admin Creation

1. **As Admin**: Go to `/admin/employees`
2. **Click**: "Add New" button
3. **Fill**: Name, Role (Admin), Email
4. **Note**: Default password shows: `LeadRabbit@123`
5. **Click**: "Add User"
6. **As New Admin**: Go to `/login`
7. **Enter**: New admin email + password `LeadRabbit@123`
8. **See**: "Password Reset Required" page
9. **Enter**: New secure password
10. **See**: QR code for authenticator app
11. **Scan**: QR code with Google Authenticator/Authy
12. **Enter**: 6-digit code
13. **Click**: "Verify & Login"
14. **Result**: ✓ Successfully logged in with new credentials

### For Each Login Attempt

| Login Type | Behavior |
|-----------|----------|
| First attempt (default pwd) | → Password reset page |
| After password change | → MFA setup page |
| After MFA enabled | → Normal login to dashboard |

---

## Production Considerations

### ✅ Already Implemented
- Default password detection
- Password hashing with bcrypt
- TOTP secret generation & verification
- Database flags for state tracking
- Multi-tenant isolation

### 🔄 Future Improvements
- [ ] Email notification with temp password (instead of showing in UI)
- [ ] Password expiration policies
- [ ] MFA recovery codes generation
- [ ] Audit log for user creation & onboarding steps
- [ ] Support for SMS 2FA as alternative
- [ ] Backup codes for account recovery

---

## Files Modified

| File | Change | Impact |
|------|--------|--------|
| `/app/api/admin/addUser/route.ts` | Added `passwordChanged: false` | New users must reset password |
| `/app/api/authenticate/route.ts` | Added default password & MFA detection | Forces password reset → MFA setup |
| `/app/api/user/change-password/route.ts` | Added `passwordChanged: true` on success | Enables MFA setup requirement |
| `/app/login/page.jsx` | ✓ Already handles flows (no changes needed) | Displays password reset & MFA UIs |

---

## Error Handling

All endpoints have proper error handling:

- Invalid credentials → 401 response
- User not found → 404 response  
- Email already taken → 400 response
- Database errors → 500 response with message
- Invalid TOTP token → 401 response

---

## Security Notes

1. **Default Password**: Hashed with bcrypt 10 rounds before storage
2. **Password Reset**: Old password cleared, new one hashed
3. **TOTP Secret**: Stored temporarily, activated only after verification
4. **JWT Token**: Created only after successful authentication
5. **Cookies**: httpOnly, sameSite=lax, 8-hour expiration

---

## Rollback Plan

If issues arise:

```bash
# Check user flags
db.users.findOne({email: "new_user@example.com"})

# Reset user to require password change again
db.users.updateOne(
  {email: "new_user@example.com"},
  {$set: {passwordChanged: false}}
)

# Reset MFA requirement
db.users.updateOne(
  {email: "new_user@example.com"},
  {$unset: {totpSecret: "", totpEnabled: ""}}
)
```

---

## Summary

This implementation provides a complete, secure onboarding experience for new users:
- **Step 1**: Admin creates user with default password
- **Step 2**: User forced to change password on first login
- **Step 3**: User forced to setup 2FA for security
- **Step 4**: User can then fully use the platform

The flow matches the customer onboarding process and ensures all new accounts have strong passwords and 2FA enabled before use.
