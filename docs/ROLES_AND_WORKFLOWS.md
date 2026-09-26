# Roles and Workflows

## Super Admin

Navigation:
- Dashboard
- Pekerjaan → Data Pekerjaan, Laporan & Export
- Data & Pengguna → Master Data, Manajemen User
- Sistem → Audit Log
- Akun

Can manage users/master data, review all work, reopen completed submissions, export, synchronize Spreadsheet, and inspect audit events.

## Admin

Navigation:
- Dashboard
- Pekerjaan → Data Pekerjaan, Laporan & Export
- Data & Pengguna → Master Data, Manajemen User
- Akun

Can operate day-to-day administration without Super Admin-only system access.

## PIC

Navigation:
- Dashboard
- Pekerjaan → Input Branding, Draft Saya, Pekerjaan Selesai
- Akun

Rules:
- PIC belongs to one Branch.
- PIC can have multiple Stockpoints.
- Each active Stockpoint assignment has one active PIC.
- PIC only sees assigned/owned operational data.

### PIC Input Flow

1. Select Stockpoint.
2. Enter Kode Toko: `4 digits / 3 digits / 3–4 digits`.
3. Enter ID Salesman: `4 digits / 3 digits / 3–4 alphanumeric beginning with a letter`.
4. Enter store, owner, phone, address, type and chiller data.
5. Capture location:
   - attempt browser geolocation;
   - retry up to 3 failed attempts;
   - after 3 failures, enter a Google Maps share URL;
   - only one location source is stored.
6. Mark whether store can be branded.
7. If brandable, upload mandatory documentation.
8. Submit and finish.

## Klien

Navigation:
- Dashboard
- Data → Laporan
- Akun

Client access is read/report oriented.

## Photo Requirements

Brandable + chiller:
- Foto Toko Before
- Foto Chiller Before
- Foto Chiller After
- Foto Wobbler
- Foto Poster
- Foto Spanduk

Brandable without chiller:
- Foto Toko Before
- Foto Wobbler
- Foto Poster
- Foto Spanduk

Non-brandable submissions require no photos but require a reason.
