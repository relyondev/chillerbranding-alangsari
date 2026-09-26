# Direct User Creation + Logout

Changes:
- Added Logout button to desktop and mobile sidebar.
- `admin-create-user` no longer sends Supabase invitation email.
- Admin/Super Admin now sets an initial password when creating a user.
- Edge Function uses `auth.admin.createUser()` with `email_confirm: true`.
- Account is immediately active and can log in with email + initial password.
- Create-user button renamed from `Kirim Undangan` to `Buat User`.

Security behavior:
- Initial password must be at least 8 characters.
- Password is only sent over the authenticated HTTPS request to the Edge Function.
- Password is not stored in `profiles` or application tables; Supabase Auth handles it.
- If DB finalization fails, the newly created Auth user is deleted as compensation.

Deploy required:
- Redeploy `admin-create-user`.

No database migration is required.
