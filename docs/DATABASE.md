# Database and Migrations

## Database

Supabase project ref: `mengddxsnoczoibuwmnr`.

## Migration Order

Run migrations in numeric order for a clean project. Production that already has 001–020 must run only newer migrations that have not been applied.

Final V1 migration:

- `021_optional_geolocation_manual_maps.sql`

### Migration 021

Adds:
- `submissions.google_maps_url`
- nullable browser coordinate fields for manual fallback
- location source consistency constraint
- updated `create_submission_draft` RPC
- updated canonical `report_submissions` RPC

Manual location row:

```text
latitude = NULL
longitude = NULL
location_accuracy_meters = NULL
location_captured_at = NULL
location_source = manual_google_maps
google_maps_url = <validated Maps URL>
```

Browser location row:

```text
latitude / longitude = captured coordinates
location_accuracy_meters = browser accuracy
location_captured_at = timestamp
location_source = browser_geolocation
google_maps_url = NULL
```

## Verify

After applying migration 021, run:

`supabase/migrations/021_VERIFY.sql`

PostgREST should expose exactly one current `create_submission_draft` signature and one canonical `report_submissions(text,text,text,integer,integer)` signature.

## Business Status

Workflow statuses:
- `draft`
- `done`

UI distinguishes reopened drafts using reopen metadata.

Branding statuses:
- `brandable`
- `not_brandable`
