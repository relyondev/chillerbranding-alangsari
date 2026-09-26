# Theme and Mobile UI

## Theme
- Light and Dark mode toggle is available in the application top bar and login page.
- Preference is stored in localStorage as `branding-ops-theme`.
- Theme is applied before application paint to reduce flashing.

## Mobile Tables
On small screens, wide tables render as cards instead of horizontal tables. Desktop/tablet keeps sortable table views. Covered screens:
- Data Pekerjaan / Reporting
- Master Data / Stockpoint
- Manajemen User
- Audit Log

Pagination and filtering use the same dataset on desktop and mobile.
