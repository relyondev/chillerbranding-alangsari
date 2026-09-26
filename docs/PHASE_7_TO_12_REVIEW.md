# Phase 7–12 Bundle Review

This bundle extends the already-applied migrations 001–005.

## Included
### Completion from earlier foundation
- Final `admin-create-user` Edge Function
- Atomic PIC code allocation per branch
- Email stored as profile snapshot
- Invite-email flow with Auth compensation on DB failure

### Phase 7 — Drive & Photo Pipeline
- `submission_photos`
- 4/6 conditional photo slots
- Google Drive private upload through Edge → HMAC Apps Script
- Browser never supplies trusted Drive file/folder IDs
- Server-side MIME + magic-byte + size validation
- Draft photo replacement
- Private app photo view endpoint
- Drive folder hierarchy:
  `Branch → Stockpoint → ID PIC - Nama PIC → Nama Warung`
- Store-folder collision suffix `(2)`, `(3)`, ...

### Phase 8 — Submission Finalization
- Submit RPC enforces:
  - Brandable + Chiller = 6 photos
  - Brandable + No Chiller = 4 photos
  - Not Brandable = 0 photos + reason
- Spreadsheet sync job is queued after business state is DONE
- Spreadsheet failure does not revert business state

### Phase 9 — Reopen
- Admin/Super Admin only
- Reason mandatory
- DONE → operation lock → all Drive photos deleted → DRAFT
- Old photo records deactivated
- All photos must be uploaded again
- Audit events retained

### Phase 10 — Dashboard & Reporting
- Role-aware navigation + submenus
- Admin/Super Admin dashboard
- PIC dashboard
- Client dashboard
- KPI cards, charts, latest-work table
- Report RPC with role scope
- Filters and Google Maps links

### Phase 11 — Spreadsheet Integration
- One spreadsheet, Branch tabs
- Stable hidden `_SYSTEM_SUBMISSION_ID`
- Idempotent UPSERT
- Direct restricted Drive links in photo columns
- Retryable integration jobs

### Phase 12 — Export
- XLSX
- PDF
- Export reads DB report data, not Google Sheet

## UI changes
- Footer: `Made with ♥ by RELYON PRODUCTION`
- Login show/hide password now uses eye icons
- Lucide icons used for navigation and operational actions
- Menu/submenu model adapted from legacy UX, but old workflows were not copied:
  - no Pool
  - no Review Foto
  - no Salesman master
  - no Legacy menu

- Duplicate race hardening uses a transaction-scoped PostgreSQL advisory lock.
- Admin can edit reopened draft business data through an audited RPC; assignment identity remains server-owned.

## UI Fix Pack
- Sidebar submenu text uses explicit light foreground color.
- Nested menu spacing/indentation improved.
- Input Branding rebuilt with visible labels and responsive minmax grid.
- Salesman code no longer overflows on desktop/mobile.
- Outdated Phase 7 placeholder copy removed.

## PIC User Form UX update
- Branch → Stockpoint is now a chained selector.
- Stockpoint list is filtered by selected Branch.
- Search/autocomplete supports both stockpoint code and stockpoint name.
- Multiple stockpoints can be selected.
- Active stockpoints already assigned to a PIC are disabled and labelled `Sudah terpakai`.
- Changing Branch clears previous Stockpoint selections.
