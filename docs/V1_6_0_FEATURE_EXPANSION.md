# Branding Chiller V1.6.0 — Salesman, Admin Edit, Dashboard & Reporting

## Scope

1. Dropdown PIC Stockpoint menampilkan nama + ID Stockpoint.
2. ID Salesman maksimum total 6 karakter pada suffix (`S` + maksimal 5 angka).
3. Master Salesman baru:
   - Salesman melekat pada Stockpoint.
   - PIC dapat mencari/preview nama salesman saat input.
   - PIC dapat menambahkan salesman pada Stockpoint assignment jika ID belum terdaftar.
   - PIC tidak dapat menghapus salesman.
   - Admin/Super Admin mendapat menu **Data Salesman** dengan Branch → Stockpoint chained dropdown.
   - Nama/kode salesman dapat diedit.
   - Salesman yang sudah memiliki pekerjaan tidak dapat dihapus.
   - Historical submission menyimpan snapshot kode/nama salesman saat visit dibuat.
4. Data Pekerjaan Admin/Super Admin:
   - **Edit** = Admin mengedit submission DONE langsung; status tetap DONE.
   - Foto DONE dapat diganti oleh Admin/Super Admin.
   - Semua edit langsung dicatat ke Audit Log.
   - **Reopen** tetap flow lama: PIC yang merevisi.
   - PIC melihat catatan `Diedit oleh Admin: ...` di Pekerjaan Selesai.
5. Pekerjaan Selesai PIC menggunakan header section hijau.
6. Favicon memakai monogram HM.
7. App route guard:
   - belum login → `/login`
   - sudah login tetapi role tidak berhak → `/app/dashboard`
8. Audit Log filter bar dirapikan agar Reset tidak keluar container.
9. Master Data di sidebar diubah menjadi **Data Stockpoint**.
10. Dashboard selesai diperluas:
    - Total Visit
    - Bisa/Tidak Bisa Dibranding + persentase
    - 6 completeness card foto + persentase
    - Stockpoint terjamah + persentase
    - Warung/Grosir + persentase
11. Chart:
    - Brandable vs Tidak Brandable dengan label persentase langsung
    - Warung vs Grosir dengan label persentase langsung
    - chart branch/stockpoint dan trend tetap ada
12. Section Brandable/Not Brandable pada Dashboard:
    - search
    - modal detail submission DONE
    - Admin/Super Admin mendapat tombol Edit & Reopen
    - Client read-only
13. Export XLSX menjadi 2 sheet:
    - `Summary`
    - `Data`
    Summary mengikuti filter aktif.
14. Export PDF:
    - logo Hanz Management
    - judul `Laporan Pemasangan Branding Chiller Alang Sari`
    - waktu update
    - Branch / `SEMUA BRANCH`
    - summary table
    - detail data

## Database safety

Migration `026_salesman_admin_edit_dashboard.sql` tidak menghapus existing submission, user, stockpoint, foto, atau audit event.

Perubahan schema bersifat additive (master table + nullable columns + indexes). Beberapa RPC/constraint direplace untuk rule ID Salesman baru dan report fields baru, tetapi existing business data tidak dihapus atau dimigrasikan ulang.

## Salesman historical behavior

Kode/nama Salesman di submission adalah snapshot. Jika Admin mengubah kode/nama pada master Salesman, pekerjaan lama tetap menyimpan evidence yang digunakan saat submission tersebut dibuat. Submission baru memakai master Salesman terbaru.

Saat dataset ±1.600 salesman diberikan, buat seed/query terpisah dan backfill `submissions.salesman_id` berdasarkan Stockpoint + full code tanpa mengubah snapshot historis.
