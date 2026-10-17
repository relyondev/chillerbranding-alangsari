# V1.7.10 — Branding Status Display Normalization

Hotfix ini tidak mengubah enum/status di database.

## Internal DB values tetap
- `brandable`
- `not_brandable`

## Label user-facing
- `brandable` → `DIBRANDING`
- `not_brandable` → `TIDAK DIBRANDING`

## Area yang diperbaiki
- Data Pekerjaan desktop/mobile
- Detail pekerjaan/dashboard
- Detail pekerjaan PIC
- Export XLSX
- Export PDF
- Google Spreadsheet sync

## Deploy
1. Overlay isi package ke repository lokal.
2. `npm run build`
3. Redeploy Edge Functions karena `_shared/spreadsheet.ts` berubah:
   - `photo-upload`
   - `spreadsheet-sync`
   - `integration-runner`
4. QA satu submission baru + manual Spreadsheet sync.

Tidak ada SQL migration.
