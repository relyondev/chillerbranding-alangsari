# V1 Final QA Checklist

## Authentication

- [ ] Super Admin login
- [ ] Admin login
- [ ] PIC login redirects to Input Branding
- [ ] Client login
- [ ] Logout

## PIC Input

- [ ] Stockpoint appears only from active assignment
- [ ] Kode Toko format 4/3/3–4 numeric
- [ ] ID Salesman format 4/3/3–4, final segment begins with letter
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

- [ ] First failure shows retry 1/3
- [ ] Second failure shows retry 2/3
- [ ] Third failure unlocks manual Google Maps field
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
