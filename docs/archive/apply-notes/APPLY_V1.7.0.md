# Branding Chiller V1.7.0
Overlay seluruh isi package ini ke repo V1.6.10 terbaru.

1. Jalankan `027_dashboard_period_filter.sql` via Supabase SQL Editor (lebih aman daripada db push pada project ini).
2. Jalankan `027_VERIFY.sql`.
3. `npm install` (menambahkan Leaflet + typings).
4. `npm run build`.
5. QA Dashboard + GPS.
6. Push GitHub.

GPS rule:
- browser watchPosition/high accuracy
- initial accuracy wajib <=5m
- DB constraint baru juga menolak accuracy >5m untuk row baru
- koreksi marker maksimal 3m dari titik awal dalam UI
- tidak ada fallback link Google Maps manual
