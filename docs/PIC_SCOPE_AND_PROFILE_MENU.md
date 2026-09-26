# PIC scope + profile logout

Changes:
- PIC login redirects directly to `/app/submissions`.
- Other roles continue to `/app/dashboard`.
- PIC dashboard only uses submissions owned by the authenticated PIC.
- PIC Stockpoint counts and per-Stockpoint chart only use active Stockpoint assignments for that PIC.
- Assigned Stockpoints with zero jobs are still represented in the Stockpoint chart.
- PIC KPI cards now show Total Pekerjaan Saya, Draft Saya, Pekerjaan Selesai, and Stockpoint Saya.
- Top-right profile icon is clickable and contains Account + Logout.
- Sidebar Logout remains available.

Database:
- Run `015_pic_dashboard_scope.sql`.
- Then run `015_VERIFY.sql`.

No Edge Function redeploy is required for these changes.
