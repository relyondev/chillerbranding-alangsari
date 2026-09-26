# Production Deployment

## 1. Frontend Environment (Vercel)

Use **Config** visibility for public framework variables:

```env
PUBLIC_SUPABASE_URL=https://mengddxsnoczoibuwmnr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<Supabase anon/public key>
```

Apply to the required Vercel environments and redeploy after changes.

## 2. Database

For the existing production database where migrations 001–020 are already present, run:

```text
021_optional_geolocation_manual_maps.sql
```

Then run `021_VERIFY.sql`.

Do not rerun 001–020 on an already initialized database.

## 3. Edge Functions

Final deployment set:

```bash
supabase functions deploy admin-create-user --project-ref mengddxsnoczoibuwmnr
supabase functions deploy photo-upload --project-ref mengddxsnoczoibuwmnr
supabase functions deploy photo-view --project-ref mengddxsnoczoibuwmnr
supabase functions deploy reopen-submission --project-ref mengddxsnoczoibuwmnr
supabase functions deploy spreadsheet-sync --project-ref mengddxsnoczoibuwmnr
supabase functions deploy integration-runner --project-ref mengddxsnoczoibuwmnr
```

After V1.0.2, `spreadsheet-sync` and `integration-runner` must be redeployed because the shared Spreadsheet serializer supports manual Maps links.

## 4. Apps Script

Deploy the `google-apps-script/Code.gs` version from this release. If the Web App URL changes, update `APPS_SCRIPT_ENDPOINT` in Supabase secrets.

## 5. Supabase Auth URLs

Set the production Vercel URL as Site URL and allow the corresponding redirect URL pattern.

## 6. Git / Vercel

Build locally:

```bash
npm install
npm run build
```

Commit and push to `main`. Vercel should deploy from the connected repository.

## 7. Smoke Test

Follow [QA_CHECKLIST.md](QA_CHECKLIST.md) before tagging the release.
