# User Management

## Create User
- Super Admin: may create Super Admin, Admin, PIC, and Client.
- Admin: may create only PIC and Client.
- PIC requires exactly one Branch and one or more unoccupied Stockpoints.

## Reset Password
- Password reset is performed by Admin/Super Admin from User Management.
- Admin may reset only PIC and Client passwords.
- Super Admin may reset other managed users.
- New passwords must be at least 8 characters.
- Password values are never written to application tables or Audit Log.
- The reset action itself is recorded as `user_password_reset`.

## Backend
Deploy Edge Function: `admin-reset-password`.
