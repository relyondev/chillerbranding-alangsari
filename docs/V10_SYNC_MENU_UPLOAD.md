# v10 fixes

## PIC menu active state
`Draft Saya` and `Pekerjaan Selesai` share `/app/my-work` but use different
query parameters. The sidebar now matches the full pathname + query string,
so only one menu is highlighted.

## Concurrent photo uploads
PhotoUploader now tracks busy state per photo slot. If two uploads run at the
same time, both corresponding cards show `Sedang mengupload...` and their own
spinner independently.

## Spreadsheet
Future submissions are synced immediately on:
- draft creation
- each successful photo upload
- final submit

Spreadsheet failures do not roll back the business transaction.

A durable DB queue is also kept through migration 017.

Admin/Super Admin now get a `Sinkronkan Spreadsheet` button in Data
Pekerjaan/Laporan. It directly backfills up to 100 current submissions per
click and is useful for submissions created before this patch.

Run:
1. `017_spreadsheet_autosync.sql`
2. `017_VERIFY.sql`

Redeploy:
- `photo-upload`
- `spreadsheet-sync`
- `integration-runner`

No Apps Script redeploy is required for v10 if v9 HMAC fix is already live.
