# V1.7.9 — Wording & PIC Button UI Hotfix

Overlay isi package ini ke root repo yang sudah menggunakan V1.7.8.

Perubahan frontend-only:
- Semua label user-facing `Bisa Dibranding` menjadi `Dibranding`.
- Semua label user-facing `Tidak Bisa Dibranding` menjadi `Tidak Dibranding`.
- Chart menjadi `DIBRANDING vs TIDAK DIBRANDING`.
- Label/report/filter/summary terkait ikut diseragamkan.
- Copy terkait dokumentasi/alasan ikut memakai wording baru.
- Tombol `Lanjutkan` PIC dipaksa memakai teks putih di light maupun dark mode.

Tidak ada migration database dan tidak ada Edge Function baru.

QA:
1. `npm run build`
2. Cek Dashboard KPI + donut chart.
3. Cek Reporting filter/export summary labels.
4. Cek Input Branding status/reason UI.
5. Cek Pekerjaan Belum Selesai dan Reopen: teks `Lanjutkan` putih.
