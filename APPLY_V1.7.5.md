# Apply V1.7.5 — PIC UX & Geolocation Lock

Frontend-only release. **No database migration and no Edge Function deploy required.**

## Main changes
- GPS initial accuracy remains <= 50 m.
- Marker correction is allowed up to 20 m from the initial GPS fix.
- Human-readable GPS error messages.
- Added **Kunci Lokasi**; draft cannot be saved until location is locked.
- Improved PIC dark-mode readability.
- Removed helper text below Salesman / Store ID segment fields.
- Added inline Salesman lookup modal with Stockpoint filter, search, and Copy ID.
- Added **Lihat Foto** for PIC completed work.
- Humanized PIC branding status labels.
- Updated address/store helper copy and user-facing product copy to **Branding Toko Chiller**.
- Login field label is shown as **Email / Username**. Authentication remains backed by Supabase email login in this frontend-only release; true username authentication requires a backend/data model decision and is intentionally not faked here.

## QA
```powershell
npm install
npm run build
```

Then test on mobile:
1. Dark mode input readability.
2. Salesman lookup modal and Copy ID.
3. GPS >50 m error message.
4. GPS <=50 m -> map -> drag <=20 m -> Kunci Lokasi -> save draft.
5. Drag >20 m -> human-readable warning and no invalid coordinate accepted.
6. Ambil Ulang Lokasi after locking.
7. PIC Pekerjaan Selesai -> Detail / Lihat Foto.
