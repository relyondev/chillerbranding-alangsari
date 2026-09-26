# CORS Patch

Browser-facing Edge Functions now:
- answer OPTIONS preflight
- return Access-Control-Allow-Origin
- allow authorization, x-client-info, apikey, content-type headers
- preserve CORS headers on JSON and binary photo responses

Redeploy:
- admin-create-user
- photo-upload
- photo-view
- reopen-submission
- spreadsheet-sync

No database migration is required.
integration-runner is server/cron-facing and does not require browser CORS.
