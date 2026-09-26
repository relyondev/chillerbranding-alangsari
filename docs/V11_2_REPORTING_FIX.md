# v11.2 Reporting RPC Fix

Root cause:
Migration 019 introduced a second overload of `report_submissions`:
- old: `(text, text, text, integer, integer)`
- new: `(text, text, branding_status, integer, integer)`

PostgREST could not reliably resolve a call containing null/string parameters.
The frontend swallowed the RPC error and displayed an empty table while
`dashboard_summary()` continued to count the same submissions.

Fix:
- Migration 020 drops both overloads.
- Recreates one canonical TEXT-based signature.
- Keeps workflow_status, reopen_reason, and reopened_at in the result.
- Data Pekerjaan now surfaces RPC errors instead of silently clearing rows.
- Search / Branch / Branding filters auto-apply.
- Workflow Status filter (Draft / Done) added.
- "Terapkan" removed.
- Reset + Perbarui retained.
- Status Pekerjaan column added.
