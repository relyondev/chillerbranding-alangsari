# Security

## Browser

Allowed frontend credentials:
- Supabase public URL
- Supabase anon/public key

Never expose:
- service-role key
- Apps Script HMAC secret
- cron secret
- privileged Drive/Spreadsheet credentials

## Database

- RLS is enabled on operational tables.
- Protected mutations use RPC/Edge Function paths.
- Role checks are enforced server-side where privileged actions are required.

## Drive

- Source Drive remains Restricted/private.
- Folder/file IDs are not trusted from browser input.
- Folder creation is server-side.

## Apps Script

- Requests use signed HMAC payloads.
- The shared signing prefix is `branding-ops\n`.
- Script Properties contain integration secrets, not frontend code.

## Location

- Browser coordinates are stored only when geolocation succeeds.
- Manual Google Maps fallback stores a URL instead of fabricated coordinates.
- Frontend validates supported Google Maps URL patterns before save.
