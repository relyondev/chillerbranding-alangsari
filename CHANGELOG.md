# 1.5.2 — Data Pekerjaan Display Normalization
- Data Pekerjaan now normalizes legacy display values to uppercase on the frontend only.
- Applies to branch, stockpoint, PIC, salesman/store codes, store/owner names, store type, and branding status.
- Address, reason, Maps links, dates, and timestamps are intentionally left unchanged.
- XLSX/PDF exports generated from Data Pekerjaan also normalize the same fields to uppercase on the frontend.
- No database migration or data rewrite is required.

# V1.5.1 — Photo Watermark & Single-attempt GPS Fallback

- Preserves all V1.5.0 client revisions, migration 025, and the `admin-create-user` Edge Function update.
- New photo uploads are processed in the frontend before upload: max 1600 px long edge, JPEG compression, then a bottom-left documentation watermark.
- Watermark uses the Hanzi Management logo when available, with automatic text fallback `HANZ MANAGEMENT`.
- Watermark lines: WIB upload timestamp, photo type, LAT/LNG, PIC code + name, and Stockpoint code + name.
- If a submission uses manual Google Maps and has no coordinates, watermark safely prints `LAT - · LNG -` rather than inventing coordinates.
- Browser GPS now gets one attempt only. On failure/unsupported geolocation, the manual Google Maps field is unlocked immediately.
- Manual Maps validation is restricted to recognized Google Maps hosts, with `https://maps.app.goo.gl/xxxxxxxx` as the placeholder.
- No new database migration and no additional Edge Function changes beyond V1.5.0.

# V1.5.0 — Client Revision: PIC ID, Form Order & Photo Compression

- PIC registration now uses a manually selected 2-digit numeric ID (01–99) with automatic Branch prefix and duplicate detection.
- Input Branding is consolidated into one section and reordered: Stockpoint → ID Salesman → Kode Toko → store data → location → store/chiller/status → reason → photos.
- Kode Toko manual suffix now accepts 2–6 numeric digits; backend validation and database constraint updated by migration 025.
- Nama Toko and Nama Pemilik are converted to uppercase in the frontend before save; Alamat and Alasan remain unchanged.
- Existing duplicate engine (3 of 4 store identity fields), branding logic, and current GPS flow are preserved.
- Photos are resized client-side to max 1600 px on the longest edge and encoded as JPEG around 82% quality before upload, with adaptive compression toward ~1 MB.
- GPS accuracy/live-map upgrade and photo watermark are intentionally excluded and remain pending additional scope.
- Requires migration `025_manual_pic_id_store_code_range.sql` and redeploy of `admin-create-user` Edge Function.

# V1.4.5 — Audit Assignment Human-readable Hotfix

- PIC Stockpoint assignment audit events now resolve PIC identity and Stockpoint UUIDs into code + name.
- Audit summary clearly states Stockpoints added, removed, and active after the change.
- Assignment audit modal no longer exposes raw UUID arrays as the primary detail.
- No database migration or Edge Function change.

## 1.4.4 - Chart light surface hotfix
- Force all chart cards to remain white in both light and dark mode.
- Preserve high-contrast chart text, grid, legend, and fixed multicolor palette.

# Changelog
## 1.3.2 - Role Dark Contrast Polish
- Dark mode surfaces now follow each role palette instead of inheriting the old navy base.
- PIC dark mode uses deep red/maroon surfaces with red accents.
- Admin/Super Admin dark mode uses neutral black/charcoal surfaces.
- Client dark mode keeps the existing blue family.
- Reset Password actions are styled as primary role-colored buttons.


## 1.3.0 — Frontend Branding Chiller
- Rebrand user-facing application to Branding Chiller.
- Add HM Hanzi Management login branding.
- Add role-based color themes with light default and dark variants.
- Add Stockpoint-driven code autofill UI and new Salesman suffix format UI.
- Add Chiller=no automatic non-brandable UX.
- Add map preview after geolocation success.
- Show PIC name and PIC ID in sidebar.
- Add Stockpoint ID to Data Pekerjaan table.
- Add photo modal preview.
- Split reporting actions into three buttons.

## 1.2.3
- Fix reopen DB function referencing nonexistent `submission_photos.updated_at`; now uses `external_deleted_at`.


## 1.2.1
- Hotfix Data Pekerjaan desktop table: restore all columns.
- Desktop table now scrolls horizontally inside the table container when needed.
- Mobile card view, sorting, and pagination remain unchanged.


## 1.1.0 — Admin UX & Session
- Admin/Super Admin menu Pekerjaan digabung menjadi satu Data Pekerjaan dengan export dan Spreadsheet sync.
- Detail foto menampilkan nama warung sebagai heading konten.
- Tambah Stockpoint aktif melalui RPC terproteksi role Admin/Super Admin.
- Sorting dan pagination pada Data Pekerjaan, Master Stockpoint, dan Manajemen User.
- Data Pekerjaan default urut data terbaru.
- Sidebar project card dihapus.
- Footer spacing diperbaiki.
- Auto logout setelah 2 jam tanpa aktivitas, dengan pesan saat kembali ke login.
- Migration baru: 022_admin_create_stockpoint.sql.

# Changelog

## 1.0.4
- Fix halaman Pengaturan Akun agar memakai komponen dinamis dan membaca profil user yang sedang login.
- Hapus placeholder User Demo / user@example.com.
- Hapus section Keamanan serta tombol Ubah Password / Ubah Email untuk V1.
- Mempertahankan seluruh fix V1.0.3 sebelumnya.

## 1.0.3
- Removed the remaining application header subtitle `Sistem Operasional Branding Warung` from the app Topbar.

# Changelog

## 1.0.2 — V1 Final Lock

- Browser geolocation is no longer a hard dependency.
- Geolocation has up to three user-triggered attempts.
- Manual Google Maps URL fallback appears after three failed attempts.
- Manual Maps URLs are validated in the frontend.
- Manual location keeps latitude/longitude/accuracy/captured-at empty and stores `google_maps_url` with `location_source=manual_google_maps`.
- Browser location clears manual Maps URL and stores `location_source=browser_geolocation`.
- Reporting and Spreadsheet use the manual Maps URL when coordinates are unavailable.
- Stockpoint layout moved to its own full-width row.
- Kode Toko and ID Salesman are side by side on wide screens.
- Kode Toko now has a Preview block matching ID Salesman.
- Helper labels are aligned under each code input.
- Input Branding subtitle removed.
- Login header subtitle removed.
- Canonical final documentation added.

## 1.0.1

- Fixed concurrent photo upload stale-state behavior.
- Hardened Google Drive folder creation with submission-level idempotency and Apps Script locking.
- Prevented parallel photo uploads from creating multiple store folders for the same submission.
- Added Spreadsheet shortcut to Export menu.

## 1.0.0

- Initial V1 production candidate with role-based workflows, reporting, exports, Drive/Spreadsheet integration, reopen flow, photo upload, and PIC scope.

## 1.2.0
- Admin reset password user dengan password baru melalui Edge Function aman.
- Admin hanya dapat membuat PIC dan Klien; Super Admin tetap dapat membuat seluruh role.
- Dark / Light mode dengan penyimpanan preferensi lokal.
- Mobile table Data Pekerjaan, Master Stockpoint, dan Manajemen User berubah menjadi card view agar tidak horizontal-scroll.
- Tambah `admin-reset-password` Edge Function dan audit event tanpa menyimpan password.

## 1.2.2
- Fixed generic `reopen_failed` responses by preserving RPC / Drive error details.
- Added explicit validation for submission ID and reopen reason.
- Reopen Drive cleanup now reports per-file failures and remains safe to retry.
- Added reopen troubleshooting documentation.

## 1.3.1 - Frontend QA Polish
- Lock Input Branding fields until PIC selects a Stockpoint.
- Render Salesman prefix `S` outside the editable textbox.
- Persist role theme across page navigation to prevent accent-color flash.
- Reduce Hanzi Management logo size on login.
- Sidebar identity now uses labeled Nama / Kode PIC / Role fields.
- Add Hanzi Management logo space in the authenticated sidebar and footer.
- Photo viewer adds Back, previous/next arrows, keyboard navigation, and thumbnail navigation.

## 1.4.0 — PIC Assignment & Code Rules
- Admin/Super Admin can manage Stockpoint assignments for an existing PIC.
- Stockpoint assignment cannot be removed after that PIC has ever created a submission on it.
- New PIC submissions enforce Stockpoint code as the first two segments of Kode Toko and ID Salesman.
- ID Salesman suffix is `S` + 1–4 digits; historical codes remain valid.
- Chiller = Tidak Ada is enforced as not brandable at the backend.
- Geolocation is truly optional; `not_provided` is accepted when GPS/manual Maps is omitted.
- Assignment changes are written to Audit Log.

## 1.4.1 — User/PIC Management QA
- Pisahkan Manajemen User dan Manajemen PIC.
- Manajemen User hanya menyisakan aksi Reset Password dan menampilkan waktu user dibuat; default sort terbaru.
- Manajemen PIC menampilkan ID PIC, Nama, Branch, Stockpoint, Status, jumlah Done/Draft, dan Edit Stockpoint.
- Filter Manajemen PIC: search, Branch, lalu Stockpoint chained dropdown.
- Modal assignment Stockpoint memiliki search dan mempertahankan Stockpoint yang sudah punya pekerjaan di urutan atas.
- Perbaikan warna teks modal Stockpoint pada light mode.
- Audit Log sekarang memakai data audit_events nyata, bukan placeholder.

## 1.4.2
- Audit Log: filter user, action, date range, role badge, human-readable detail modal, pagination 20/50/100.
- Manajemen User: colored role badges.
- Kelola Stockpoint PIC: existing assignments prioritized and labeled; newly selected Stockpoints move to the selected group immediately.
- Dashboard charts: role-aware/dark-mode-aware canvas colors, labels, grids, legends, and fills for better contrast.

## 1.4.3 - Audit & Chart UI Polish
- Chart cards now stay white in both light and dark mode for consistent readability.
- Dashboard charts use a fixed high-contrast multi-color palette.
- Audit detail modal contrast fixed for light mode and kept readable in dark mode.
- Audit date filters now show explicit Dari tanggal / Sampai tanggal labels.
- Audit table headers are sortable; default remains newest audit event first.

## 1.4.6 — UI wording hotfix
- Footer changed to “Development by Hanz Management in collaboration with Relyon”.
- Admin/Super Admin action button label changed from “Reopen” to “Edit”; underlying reopen workflow is unchanged.
