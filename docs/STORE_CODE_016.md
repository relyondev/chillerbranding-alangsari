# Migration 016 — Kode Toko

New format:
- Part 1: exactly 4 numeric digits
- Part 2: exactly 3 numeric digits
- Part 3: 3–4 numeric digits
- Combined: `1234/123/123` or `1234/123/1234`

Changes:
- Input Branding UI uses three numeric fields separated by `/`.
- Frontend builds one `store_code`.
- DB CHECK constraint updated.
- `create_submission_draft` validates new format.
- `admin_update_reopened_submission` validates new format.
- Reporting, Spreadsheet and Drive integrations continue to use the combined value.

Run:
1. `016_store_code_format.sql`
2. `016_VERIFY.sql`

Important:
Migration 016 intentionally aborts if historical submissions still contain the old 3–4 digit format. Reconcile those rows first instead of silently rewriting business data.
