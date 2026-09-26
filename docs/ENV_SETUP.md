# Environment setup

Create `.env` locally from `.env.example`.

Browser-safe:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Server-only (do not expose in frontend):
- `SUPABASE_SERVICE_ROLE_KEY`
- `APPS_SCRIPT_ENDPOINT`
- `APPS_SCRIPT_HMAC_SECRET`
- `GOOGLE_DRIVE_ROOT_ID`
- `GOOGLE_SPREADSHEET_ID`

The browser bundle must never contain server-only variables.
