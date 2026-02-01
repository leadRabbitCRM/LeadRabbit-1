# Quick Reference: New User Onboarding Flow

## What Changed?

When a new user/admin is created and logs in with the default password, they must:
1. ✓ Reset their password
2. ✓ Set up 2FA (MFA)
3. ✓ Then login normally

## Modified Files

### 1. `/app/api/admin/addUser/route.ts`
```typescript
// Added to newUser object:
passwordChanged: false,  // Triggers password reset on first login
```

### 2. `/app/api/authenticate/route.ts`
```typescript
// Added detection: If login with default password + !passwordChanged
// → Return requiresPasswordReset: true

// Added detection: If passwordChanged + no MFA setup
// → Generate TOTP secret & return requiresTotpSetup: true
```

### 3. `/app/api/user/change-password/route.ts`
```typescript
// Added to update:
passwordChanged: true,  // Enables MFA setup requirement
```

## User Experience Flow

```
Login with default password
        ↓
"Password Reset Required" screen
        ↓
User enters new password
        ↓
API validates & updates passwordChanged: true
        ↓
Auto-login with new password
        ↓
"Setup 2FA" screen with QR code
        ↓
User scans QR & enters code
        ↓
Successfully logged in ✓
```

## Testing

1. Go to `/admin/employees`
2. Click "Add New"
3. Create user with name, role, email
4. Copy user email
5. Go to `/login`
6. Enter email + `LeadRabbit@123`
7. Should see password reset screen
8. Change password
9. Should see 2FA setup screen
10. Scan QR code and verify
11. Should be logged in

## Database Flags Used

| Flag | Value | Meaning |
|------|-------|---------|
| `passwordChanged` | `false` | Must change password |
| `passwordChanged` | `true` | Can proceed to MFA setup |
| `totpSecret` | `undefined` | No MFA setup |
| `totpSecret` | `base32string` | MFA being setup |
| `totpEnabled` | `true` | MFA active |

## API Endpoints

| Endpoint | When Called | Returns |
|----------|------------|---------|
| `POST /api/authenticate` | Login attempt | `requiresPasswordReset` or `requiresTotpSetup` or `success` |
| `POST /api/user/change-password` | Password reset | Sets `passwordChanged: true` |
| `POST /api/authenticate` with TOTP | MFA verification | Sets `totpEnabled: true` and JWT token |

## No Changes Needed

✓ Login page (`/app/login/page.jsx`) - Already handles all flows
✓ MFA setup components - Already work correctly
✓ TOTP verification - Already implemented

## Differences from Admin Password Reset

**Default Password Flow** (NEW):
- Triggered automatically on first login
- User must change password
- Forces MFA setup after password change
- Marks `passwordChanged: false` initially

**Admin Password Reset** (EXISTING):
- Initiated by admin from employees page
- Sets `passwordResetRequired: true`
- Shows password in toast notification
- Doesn't affect MFA unless admin also resets it

## Troubleshooting

**"I see password reset screen but password won't change"**
- Check password meets requirements (8+ chars, uppercase, lowercase, number, special char)
- Check email is correct
- Check network connection

**"After password reset, I see error"**
- Check if new password is different from default
- Check if special characters are properly formatted
- Try clearing browser cache

**"MFA setup screen not showing"**
- Try logging out and logging in again
- Check if `passwordChanged: true` is set in database
- Verify TOTP secret was generated

**"QR code won't scan"**
- Try using the manual entry code shown below QR
- Try different authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
- Check internet connection for QR generation

## Future Enhancements

- [ ] Email with temp password instead of showing in UI
- [ ] SMS 2FA option
- [ ] Backup recovery codes
- [ ] Password expiration policies
- [ ] Audit logging for user creation
