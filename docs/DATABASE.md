# Database and Migrations

## Production Database

Supabase project ref: `mengddxsnoczoibuwmnr`.

Database changes are migration-based and should remain additive whenever practical. Do not run destructive reset commands against production.

## Current Migration Range

The repository currently contains migrations **001 through 029**.

| No. | Migration | Purpose |
| ---: | --- | --- |
| 001 | foundation | Core schema/roles foundation |
| 002 | security_foundation | RLS/security baseline |
| 003 | submission_core | Submission core |
| 004 | submission_rpc_duplicate | Submission RPC + duplicate rules |
| 005 | audit_foundation | Audit foundation |
| 006 | admin_user_ops | Admin user operations |
| 007 | photo_drive_foundation | Photo/Drive foundation |
| 008 | submit_photo_rules | Submit/photo rules |
| 009 | reopen_ops | Reopen operations |
| 010 | reporting | Reporting baseline |
| 011 | integration_hardening | Integration hardening |
| 012 | duplicate_race_hardening | Duplicate race hardening |
| 013 | admin_edit_reopened | Admin edit for reopened submissions |
| 014 | stockpoint_seed_historical_marker | Historical marker for manually applied Stockpoint seed |
| 015 | pic_dashboard_scope | PIC dashboard scope |
| 016 | store_code_format | Store Code format |
| 017 | spreadsheet_autosync | Spreadsheet autosync |
| 018 | reopen_notifications | Reopen metadata/notification-era schema |
| 019 | reporting_reopen_fields | Reporting reopen fields |
| 020 | fix_report_submissions_signature | Canonical report RPC signature |
| 021 | optional_geolocation_manual_maps | Original optional/manual geolocation support |
| 022 | admin_create_stockpoint | Admin Stockpoint creation |
| 023 | fix_finalize_reopen_photo_timestamp | Reopen/photo timestamp fix |
| 024 | pic_assignment_and_salesman_rules | PIC assignment + Salesman/business rules |
| 025 | manual_pic_id_store_code_range | Manual PIC number + Store Code range |
| 026 | salesman_admin_edit_dashboard | Salesman master + Admin edit/dashboard expansion |
| 027 | dashboard_period_filter | Dashboard period/geolocation rework support |
| 028 | dashboard_wib_pic_working | WIB dashboard + PIC-working metrics |
| 029 | location_accuracy_50m | Geolocation accuracy threshold 50 m |

Each normal migration has a matching `*_VERIFY.sql` helper. Migration 014 now also has a verification helper, but its migration file is intentionally a **historical marker**.

## Important: Migration 014

The original 014 migration was the approved Stockpoint master seed applied manually during the early production rollout. The generated seed SQL was not preserved in the Git repository. Production Stockpoint data continued to exist and later migrations depend on it.

To avoid pretending the original seed can be reconstructed exactly, `014_stockpoint_seed_historical_marker.sql` is a no-op marker. It closes the numbering/documentation gap without changing production data.

For a **brand-new database**, the approved Stockpoint master must be restored/imported separately before features that depend on Stockpoints are used.

## Production Deployment Rule

Because a portion of the historical migrations were applied manually through Supabase SQL Editor, do not blindly run `supabase db push` against production until migration history has been deliberately reconciled.

For a new migration:

1. Review the SQL file.
2. Apply only the new migration in Supabase SQL Editor when production migration history is not CLI-aligned.
3. Run its matching `*_VERIFY.sql`.
4. Validate affected RPC/RLS/UI flows.

Never run:

```bash
supabase db reset
```

against production.

## Current Business Status

Workflow status remains centered on:

- `draft`
- `done`

Reopened work is distinguished through reopen metadata while returning to an editable workflow.

Branding status remains:

- `brandable`
- `not_brandable`
