# Branding Ops App — Phase 1

Astro + TypeScript + React islands + Tailwind v4 + Poppins + Supabase JS + Zod.

Brand palette: `#0B1D3A`, `#1565EF`, `#4DB6FF`, `#BEE6FF`, `#FFC107`.

Run: `npm install` then `npm run dev`. Verify with `npm run build`.

Phase 1 only: no migrations, no production DB logic, auth is placeholder.


## Phase 1 v2
Login page revised to match the approved two-column reference layout while retaining the Relyon brand palette.

## Phase 1 v3
- Role-aware navigation skeleton for Super Admin, Admin, PIC, and Klien.
- Dashboard KPI skeleton varies by role.
- Temporary role preview supported with `/app/dashboard?role=pic`, `admin`, `client`, or `super_admin`.
- This preview is UI-only and will be removed once Supabase Auth/Profile roles are active.

## Phase 1 v4
Role preview is now client-side, because the Phase 1 Astro app is statically rendered. Query parameter changes now update:
- Dashboard KPI cards
- Sidebar navigation
- Mobile navigation
- Role labels
- PIC-specific chart/table labels

This is preview-only; Supabase Auth/Profile will become authoritative later.


## Multi-phase bundle (Phase 1–6)
This package includes the reviewed foundation through the duplicate engine.
See `docs/PHASE_1_TO_6_REVIEW.md`.

Important:
- Do not deploy production yet.
- Run migrations only on the NEW Supabase project.
- Run each `*_VERIFY.sql` after its migration.
- Phase 7 will introduce the Google Drive/photo pipeline.


## Phase 7–12 bundle
See `docs/PHASE_7_TO_12_REVIEW.md` and `docs/PHASE_7_TO_12_DEPLOY.md`.


## Patch V1.1
- Fix laporan page ReferenceError (`Download` icon import).
- Refine login page based on latest visual reference, keeping existing copywriting.
- Responsive login layout for mobile and desktop.
