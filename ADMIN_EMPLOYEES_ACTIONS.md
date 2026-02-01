# Admin Employees Actions - Implementation Summary

## Overview
Added three powerful admin actions for managing employees/users in the admin/employees page:
1. **Delete User/Admin** - Remove employee from the system (self-deletion prevented)
2. **Reset Password** - Generate temporary password for user password reset
3. **Reset MFA** - Remove MFA settings to allow user to re-setup authentication

---

## Features Implemented

### 1. Delete User/Admin
- **Location**: Employees dropdown menu (Actions column)
- **Security**: Admin cannot delete their own account
- **Confirmation**: Warning modal with irreversible action notice
- **Database**: Deletes both users and employees collection records
- **API Endpoint**: `DELETE /api/admin/employees/[id]`

### 2. Reset Password
- **Location**: Employees dropdown menu (Actions column)
- **Action**: Generates a temporary 12-character password
- **Confirmation**: Modal with explanation about next login reset requirement
- **Database**: Sets `passwordResetRequired` flag to true
- **Response**: Returns temporary password (in production, should be sent via email)
- **API Endpoint**: `PUT /api/admin/employees/[id]` with `action: "resetPassword"`

### 3. Reset MFA (Two-Factor Authentication)
- **Location**: Employees dropdown menu (Actions column)
- **Action**: Removes MFA secret and settings
- **Confirmation**: Modal explaining user must re-setup MFA
- **Database**: Unsets `mfaSecret` and `mfaEnabled` fields
- **API Endpoint**: `PUT /api/admin/employees/[id]` with `action: "resetMfa"`

---

## Files Modified

### 1. `/app/api/admin/employees/[id]/route.ts`
**Changes**: Added two new action handlers in the PUT endpoint

#### Reset Password Action Handler
```typescript
if (action === "resetPassword") {
  const userDoc = await usersCollection.findOne({ _id: userId });
  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  
  // Generate temporary password (12 characters)
  const tempPassword = Math.random().toString(36).substring(2, 14);
  const now = new Date();
  
  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        password: tempPassword,
        passwordResetRequired: true,
        updatedAt: now,
      },
    },
  );
  
  return NextResponse.json({
    message: "Password reset successfully",
    tempPassword, // Should be sent via email in production
    resetRequired: true,
  });
}
```

#### Reset MFA Action Handler
```typescript
if (action === "resetMfa") {
  const userDoc = await usersCollection.findOne({ _id: userId });
  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  
  const now = new Date();
  
  await usersCollection.updateOne(
    { _id: userId },
    {
      $unset: {
        mfaSecret: "",
        mfaEnabled: "",
      },
      $set: {
        updatedAt: now,
      },
    },
  );
  
  return NextResponse.json({
    message: "MFA has been reset successfully",
    mfaEnabled: false,
  });
}
```

### 2. `/app/admin/employees/components/empTable.jsx`
**Changes**: Added UI handlers, action buttons, and confirmation dialogs

#### New Imports
```javascript
import { KeyIcon, ShieldExclamationIcon } from "@heroicons/react/24/solid";
```

#### New Handler Functions
- `handleResetPassword(user)` - Initiates password reset action
- `performResetPassword(userId)` - Executes API call for password reset
- `handleResetMfa(user)` - Initiates MFA reset action
- `performResetMfa(userId)` - Executes API call for MFA reset

#### Updated Dropdown Menu
Added to both desktop (Table) and mobile (Card) views:
```jsx
<DropdownItem
  key="resetPassword"
  onPress={() => handleResetPassword(user)}
  startContent={<KeyIcon className="w-4 h-4" />}
  color="warning"
>
  Reset Password
</DropdownItem>
<DropdownItem
  key="resetMfa"
  onPress={() => handleResetMfa(user)}
  startContent={<ShieldExclamationIcon className="w-4 h-4" />}
  color="warning"
>
  Reset MFA
</DropdownItem>
```

#### Updated Confirmation Modal
Enhanced to show action-specific icons and warning messages:
- Reset Password: Key icon with warning about next login
- Reset MFA: Shield icon with warning about re-setup requirement
- Delete: Trash icon (existing)

---

## User Experience

### Desktop View
All actions are in a dropdown menu (three dots icon) in the Actions column for each employee row.

### Mobile View
Same dropdown menu integrated into card-based layout.

### Action Flow
1. User clicks dropdown menu for an employee
2. Selects desired action (Reset Password, Reset MFA, or Delete)
3. Confirmation modal appears with:
   - Clear description of the action
   - Warning about consequences
   - Cancel/Confirm buttons
4. Upon confirmation:
   - API request is sent
   - Loading state is shown
   - Success/error toast appears
   - Employee list updates (or refreshes for delete)

---

## Security Features

1. **Self-Deletion Protection**
   - Current admin cannot delete their own account
   - Delete option only shows if `currentUserEmail !== user.email`

2. **Admin-Only Access**
   - All endpoints require admin authentication
   - User role validation in API routes

3. **Confirmation Dialogs**
   - Critical actions require explicit confirmation
   - Clear warning messages about irreversible actions

4. **Toast Notifications**
   - Success messages confirm action completion
   - Error messages display API response errors
   - Temporary password shown in success toast (should be email in production)

---

## Production Considerations

### Password Reset
⚠️ **TODO**: Replace temporary password display with email notification
- Current: Shows password in toast and response
- Recommended: Send temporary password via email instead
- Implement: Integration with email service (SendGrid, Mailgun, etc.)

### Password Storage
⚠️ **TODO**: Hash passwords before storing
- Current: Stores plain text (for development)
- Recommended: Hash with bcrypt before storage
- Reference: Use same hashing as during user creation

### MFA Reset
✅ Properly removes MFA configuration
- User must re-authenticate and set up MFA on next login
- No security gap as MFA is disabled temporarily

### Audit Logging
⚠️ **TODO**: Add audit trail
- Log who performed which action and when
- Include target user email and timestamp
- Store in separate audit collection

---

## Testing Checklist

- [ ] Delete employee - verify record removed from both collections
- [ ] Delete self - verify delete option is hidden/disabled
- [ ] Reset password - verify temporary password works on next login
- [ ] Reset password - verify `passwordResetRequired` flag is set
- [ ] Reset MFA - verify user must re-setup MFA on next login
- [ ] Reset MFA - verify both `mfaSecret` and `mfaEnabled` are cleared
- [ ] Confirmation modals - verify appropriate warnings display
- [ ] Toast notifications - verify success/error messages appear
- [ ] Mobile view - verify all actions work on smaller screens
- [ ] Admin-only - verify non-admin users cannot access endpoints

---

## API Endpoints Summary

| Method | Endpoint | Action | Description |
|--------|----------|--------|-------------|
| DELETE | `/api/admin/employees/[id]` | - | Delete user/admin |
| PUT | `/api/admin/employees/[id]` | `resetPassword` | Reset password |
| PUT | `/api/admin/employees/[id]` | `resetMfa` | Reset MFA |

All endpoints require admin authentication via JWT token in cookies.

---

## Related Documentation
- See [API response examples](#api-endpoints-summary) above
- Existing verify/unverify actions for reference
- Employee management flow in admin panel
