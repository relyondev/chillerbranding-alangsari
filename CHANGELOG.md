# Changelog

## 1.7.5 — PIC UX & Geolocation Lock
- Initial geolocation remains accepted at accuracy <= 50 m.
- Marker correction expanded to maximum 20 m from the initial GPS fix.
- Added human-readable geolocation errors and a **Kunci Lokasi** confirmation step.
- Improved PIC dark-mode readability.
- Removed helper copy under Salesman / Store code segment fields.
- Added inline Salesman lookup modal with Stockpoint filter, search, and Copy ID.
- Added **Lihat Foto** to PIC completed work.
- Humanized branding status labels in PIC detail.
- Updated user-facing product copy to **Branding Toko Chiller**.
- Updated address/store helper copy and login identifier label.
- No database migration or Edge Function change.

This file tracks production-facing baselines. Detailed historical notes remain in `docs/archive/`.

## V1.7.4 — Repository Cleanup Baseline

- Normalized package/version metadata.
- Reduced root Markdown clutter by archiving old apply/release notes.
- Added migration 014 historical marker + verification helper to close the visible numbering gap without modifying production data.
- Updated database/release documentation to migrations 001–029.
- Removed accidental repository artifact `er.name` from the cleaned source package.
- No intended runtime/database behavior change.

## V1.7.3 — Leaflet Retake Hotfix

- Fixed blank Leaflet map after `Ambil Ulang Lokasi` by disposing the previous map/marker lifecycle before remounting.

## V1.7.2 — Geolocation 50m Hotfix

- Relaxed accepted browser geolocation accuracy to 50 m.
- Kept draggable correction limit at 3 m.
- Removed accuracy chatter while acquiring location.

## V1.7.1 — Dashboard WIB Hotfix

- Normalized dashboard period calculations to WIB / Asia-Jakarta.
- Improved period selector/header presentation.
- Replaced Stockpoint Terjamah KPI with PIC Bekerja.

## V1.7.0 — Dashboard + Geolocation Rework

- Reworked global dashboard period filtering and KPI/chart presentation.
- Added Leaflet/OpenStreetMap draggable location correction.
- Removed manual Google Maps fallback from the active geolocation flow.
- Added alternating table-row presentation.

## V1.6.x — Salesman / Reporting / Dashboard Expansion

- Added Salesman master linked to Stockpoint, PIC reference flow, seed/import tooling, Admin Salesman management, reporting improvements, PIC detail views, leaderboards, mobile QA fixes, PDF/XLSX improvements, and submit UX updates.

## V1.5.x — Client Revision

- Added manual two-digit PIC number flow, revised form order, Store Code range changes, frontend uppercase normalization, image compression/watermark processing, GPS fallback revisions, and Data Pekerjaan display normalization.

## V1.4.x — Assignment / Audit Hardening

- Added PIC–Stockpoint assignment management, assignment enforcement, Audit Log improvements, dashboard/chart QA, and role-theme polish.

## V1.3.x — Branding Chiller Rebrand

- Rebranded application UI for Hanzi Management / Branding Chiller and refined role-based themes, mobile behavior, photo viewer, and field input UX.

## V1.2.x — User / Theme / Reopen Hardening

- Added direct password reset, role creation restrictions, responsive tables/cards, theme support, and reopen error handling.

## V1.1.x — Admin UX

- Expanded Admin UX, session handling, stockpoint management, and operational QA.

## V1.0.x — Production Baseline

- Established production workflow, photo/Drive integration, reporting, duplicate controls, reopen flow, spreadsheet synchronization, and final-lock hardening.
