# V1.5.2 — Data Pekerjaan Display Normalization

This release applies uppercase normalization only while rendering Data Pekerjaan. Existing database values are not changed.

Uppercase display fields:
- Branch
- Stockpoint
- ID/Nama PIC
- Kode Salesman
- Kode Toko
- Nama Toko
- Nama Pemilik
- Jenis Store
- Status Branding

Not normalized:
- Alamat
- Alasan
- Google Maps URL
- Tanggal/timestamp

XLSX/PDF exports generated from Data Pekerjaan use the same uppercase presentation rules. Address, reason, Maps URL, dates, and timestamps are preserved.

No migration and no Edge Function redeploy are required for this V1.5.2-only change.
