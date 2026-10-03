# V1.4.1 User / PIC / Audit

## Manajemen User
- Create user tetap tersedia sesuai role permission.
- Aksi tabel hanya Reset Password.
- Kolom terakhir `Dibuat` menggunakan `profiles.created_at`.
- Default sorting: user terbaru.

## Manajemen PIC
- Hanya menampilkan profile dengan role PIC.
- Filter otomatis: search, Branch, Stockpoint. Stockpoint disabled sampai Branch dipilih.
- Kolom: ID PIC, Nama, Branch, Stockpoint, Status, Pekerjaan Selesai, Pekerjaan Draft, Edit Stockpoint.
- Assignment menggunakan RPC migration 024.
- Stockpoint yang punya pekerjaan tidak bisa dilepas dan ditampilkan lebih dulu di modal.

## Audit Log
- `/app/audit` sekarang merender AuditLogPage dan membaca `audit_events`.
- Tidak ada migration baru pada release ini.
