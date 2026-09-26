# V1.2.0 Release Notes

## Features
- Admin/Super Admin password reset from User Management.
- Admin create-user restriction: PIC and Client only.
- Light / Dark mode with persisted preference.
- Responsive mobile card layouts for all primary table pages.

## Deployment
No database migration is required.

Redeploy these Edge Functions because their source changed/new:
```powershell
supabase functions deploy admin-create-user --project-ref mengddxsnoczoibuwmnr
supabase functions deploy admin-reset-password --project-ref mengddxsnoczoibuwmnr
```

Then push frontend source to GitHub/Vercel.
