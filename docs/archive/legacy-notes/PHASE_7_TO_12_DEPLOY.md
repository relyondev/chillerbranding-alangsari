# Deployment order — DO NOT PUSH/PRODUCTION DEPLOY UNTIL APPROVED

## A. Database
Run on the NEW Supabase project only:

1. `006_admin_user_ops.sql`
2. `006_VERIFY.sql`
3. `007_photo_drive_foundation.sql`
4. `007_VERIFY.sql`
5. `008_submit_photo_rules.sql`
6. `008_VERIFY.sql`
7. `009_reopen_ops.sql`
8. `009_VERIFY.sql`
9. `010_reporting.sql`
10. `010_VERIFY.sql`
11. `011_integration_hardening.sql`
12. `011_VERIFY.sql`

Stop immediately on any error.

## B. Google Apps Script

Replace the new standalone Apps Script `Code.gs` with:
`google-apps-script/Code.gs`

Project Script Properties:
- `DRIVE_ROOT_ID` = new Drive root ID
- `SPREADSHEET_ID` = new spreadsheet ID
- `HMAC_SECRET` = newly generated random secret

Deploy a NEW Web App version after saving.

Do not enable public Drive sharing. The Drive root remains Restricted and the Client account remains Viewer.

## C. Supabase Edge Function secrets

Set only on the NEW Supabase project:

- `APPS_SCRIPT_ENDPOINT`
- `APPS_SCRIPT_HMAC_SECRET`
- `CRON_SECRET`

Supabase automatically provides project URL/service role environment for deployed functions in supported deployments; if local tooling requires explicit values, use only the NEW project values.

## D. Deploy functions

- `admin-create-user`
- `photo-upload`
- `photo-view`
- `reopen-submission`
- `spreadsheet-sync`
- `integration-runner`

The browser does not receive service role, HMAC secret, Drive root ID, or Spreadsheet ID.

## E. Integration runner

`integration-runner` can be invoked periodically using a Supabase scheduled task / external scheduler with header:

`X-Cron-Secret: <CRON_SECRET>`

It claims retryable jobs using `FOR UPDATE SKIP LOCKED` semantics inside the DB RPC.

## F. Frontend environment

Browser safe:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Do NOT place these server secrets in browser env:
- service role
- HMAC
- Drive root ID
- Spreadsheet ID


### Important Apps Script signing note
The Edge Functions send an HMAC-signed JSON envelope in the POST body. This intentionally does **not** depend on custom HTTP headers, because Apps Script Web Apps do not reliably expose arbitrary request headers to `doPost(e)`.
