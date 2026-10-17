# V1.7.8 Status Reason UI Fix

Overlay isi folder ini ke root repo lokal.

Fix aktual ada pada:
`src/features/submissions/SubmissionForm.tsx`

QA:
1. Pilih Stockpoint dan isi prerequisite form.
2. Status Branding harus berupa dropdown.
3. Pilih `TIDAK DIBRANDING`.
4. Harus muncul `Kategori Alasan Tidak Dibranding` dengan opsi Tutup Permanen / Pindah Lokasi / Perbaikan.
5. Field Alasan muncul dan wajib.
6. Pilih `DIBRANDING`: section kategori/alasan hilang.
7. `npm run build`.

Tidak ada migration / Edge Function.
