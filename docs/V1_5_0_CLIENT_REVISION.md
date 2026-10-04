# Branding Chiller V1.5.0 — Client Revision

> Superseded for deployment by V1.5.1. V1.5.1 includes this entire baseline plus photo watermark and single-attempt GPS fallback.

## Scope

1. PIC ID manual: Branch prefix remains automatic; Admin/Super Admin enters exactly two numeric digits (`01`–`99`). Duplicate ID inside the same Branch is rejected.
2. Input form order: Stockpoint, ID Salesman, Kode Toko, Nama Toko, Nama Pemilik, No HP/WA, Alamat, GPS/GMaps, Jenis Store, Chiller, Status Branding, Alasan, Foto. The user-facing form is presented as one section.
3. Kode Toko suffix: 2–6 numeric digits.
4. Duplicate submission logic remains the existing >=3/4 identity match rule.
5. Uppercase conversion is frontend-only for Nama Toko and Nama Pemilik. Database constraints are not added for casing. Alamat and Alasan are preserved as typed.
6. GPS/live map/3m accuracy changes are not included.
7. Branding status model remains unchanged (`brandable` / `not_brandable`).
8. Photo watermark is not included.
9. Photo optimization: max longest edge 1600 px, JPEG quality starts at 82%, adaptive quality reduction if needed toward ~1 MB. No upscaling.

## Deployment order

1. Apply migration `025_manual_pic_id_store_code_range.sql`.
2. Run `025_VERIFY.sql`.
3. Deploy Edge Function `admin-create-user`.
4. Deploy frontend (Vercel auto-deploy from GitHub is acceptable).
5. QA PIC creation, duplicate PIC ID, store-code 2 and 6 digit cases, uppercase behavior, draft/submit, and photo upload from Android/iPhone.

## Not changed

- Existing duplicate submission engine.
- Existing GPS capture/manual Google Maps fallback.
- Workflow statuses and branding business logic.
- Reopen behavior.
- Spreadsheet/Drive integration.
