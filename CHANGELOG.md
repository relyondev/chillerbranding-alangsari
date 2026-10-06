# V1.7.2 — Geolocation 50m UX Hotfix

- Browser GPS initial fix is accepted at accuracy <= 50 meters.
- During GPS acquisition the UI only shows a loading state (`Mencari lokasi...`).
- Accuracy numbers / target messages are hidden during acquisition.
- Once accepted, the UI shows a simple `Lokasi ditemukan` status.
- Leaflet marker correction remains limited to maximum 3 meters from the raw GPS point.
- Manual Google Maps fallback remains disabled.
- Migration 029 replaces the previous <=5m DB check with <=50m without modifying existing submission data.
