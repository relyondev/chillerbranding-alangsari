# V1.7.3 — Leaflet Retake Location Hotfix

Overlay package ini di atas source V1.7.2/V1.7.1 terbaru.

Perubahan hanya pada `GeoLocationPicker.tsx`:
- destroy instance Leaflet lama sebelum `Ambil Ulang Lokasi`
- reset marker/map/raw coordinate refs
- clear displayed accuracy saat retake
- map baru dibuat pada DOM container baru dan `invalidateSize()` tetap dijalankan

Tidak ada migration SQL atau Edge Function baru.

Setelah overlay:

```powershell
npm run build
```

QA mobile:
1. Ambil Lokasi sampai map tampil.
2. Geser pin <=3m.
3. Klik Ambil Ulang Lokasi.
4. Tunggu GPS baru ditemukan.
5. Pastikan tile map tampil kembali, bukan area putih.
6. Ulangi retake 2-3 kali.
