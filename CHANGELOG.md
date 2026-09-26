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
