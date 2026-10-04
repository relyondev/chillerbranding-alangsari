# V1 Final QA Checklist

## Authentication

- [ ] Super Admin login
- [ ] Admin login
- [ ] PIC login redirects to Input Branding
- [ ] Client login
- [ ] Logout

## PIC Input

- [ ] Stockpoint appears only from active assignment
- [ ] Kode Toko prefix mengikuti Stockpoint; suffix 2–6 digit numeric
- [ ] ID Salesman prefix mengikuti Stockpoint; suffix S + 1–4 digit
- [ ] Phone begins `08` and is at least 9 digits
- [ ] Address is at least 20 characters
- [ ] Duplicate submission rule blocks >=3/4 duplicate match

## Location — Browser Success

- [ ] Click Ambil Lokasi Saat Ini
- [ ] Browser location succeeds
- [ ] Coordinate + accuracy badge appears
- [ ] Manual Maps field never appears
- [ ] Saved row has coordinates and `google_maps_url = NULL`

## Location — Browser Failure

- [ ] GPS hanya dicoba 1 kali
- [ ] First failure langsung unlock manual Google Maps field
- [ ] Tombol GPS tidak menawarkan retry kedua
- [ ] Invalid non-Google link is rejected
- [ ] `https://maps.app.goo.gl/...` is accepted
- [ ] Saved manual row has NULL coordinates and populated `google_maps_url`
- [ ] Report Maps link opens manual link
- [ ] Spreadsheet location cell contains manual link

## Photos / Drive

- [ ] Multiple photo uploads do not create duplicate Stockpoint folders
- [ ] Multiple photo uploads do not create duplicate store folders
- [ ] Already-saved photo does not revert to upload-required state
- [ ] Drive file names follow convention
- [ ] Existing photo slots persist after reload
- [ ] New upload is resized to max 1600 px long edge
- [ ] New upload contains bottom-left Hanzi watermark with WIB time, photo type, GPS, PIC, and Stockpoint
- [ ] Manual Maps submission watermark uses LAT - / LNG - when coordinates are unavailable

## Completion

- [ ] Brandable + chiller requires 6 photos
- [ ] Brandable without chiller requires 4 photos
- [ ] Non-brandable requires reason and no photos
- [ ] DONE becomes read-only for PIC

## Reporting

- [ ] Filters auto-apply
- [ ] Export XLSX respects active filters
- [ ] Export PDF respects active filters
- [ ] Buka Spreadsheet works
- [ ] Sync Spreadsheet works for Admin/Super Admin

## Admin

- [ ] User management
- [ ] Master data
- [ ] Reopen DONE job
- [ ] Audit Log displays records

## Responsive

- [ ] Login mobile
- [ ] PIC Input mobile
- [ ] Photo uploader mobile
- [ ] Reporting mobile/table horizontal scroll


## V1.1.0 checks
- [ ] Admin/Super Admin hanya melihat satu menu Data Pekerjaan di grup Pekerjaan.
- [ ] Data Pekerjaan default newest-first; semua header sortable; pagination 10/25/50/100/All.
- [ ] Master Data: Tambah Stockpoint berhasil dan duplicate ditolak; header sortable; pagination 25/50/100/250/All.
- [ ] Manajemen User: header sortable; pagination 10/25/50/100/All.
- [ ] Detail foto menampilkan nama warung pada heading konten.
- [ ] Sidebar tidak menampilkan card Project.
- [ ] Footer memiliki spasi antara ikon love dan kata by.
- [ ] Setelah 2 jam tanpa aktivitas user logout otomatis dan login menampilkan pesan timeout.


## V1.2.0 QA
- [ ] Admin create modal only offers PIC/Klien.
- [ ] Super Admin can still create Admin/Super Admin/PIC/Klien.
- [ ] Admin can reset PIC/Klien password; cannot reset Admin/Super Admin.
- [ ] Super Admin can reset supported users.
- [ ] Dark/light mode survives refresh and text remains readable.
- [ ] Data Pekerjaan, Stockpoint, User Management show card view on mobile without horizontal page scrolling.
