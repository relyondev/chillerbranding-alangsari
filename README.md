# Branding Chiller

Production web application for Relyon Production to manage Branding Chiller field operations from PIC input through documentation, reporting, Google Drive storage, and Google Spreadsheet synchronization.

## Release

**Current package — V1.5.2**

This package includes the V1.5.0 client revision, photo watermark processing, single-attempt GPS fallback, and frontend-only uppercase normalization for legacy values shown/exported from Data Pekerjaan.

## Stack

- Astro + TypeScript
- React islands
- Tailwind CSS
- Poppins + Lucide React
- Supabase Auth / PostgreSQL / RPC / RLS / Edge Functions
- Google Apps Script
- Google Drive (private source storage)
- Google Spreadsheet
- Vercel

## Main Roles

- Super Admin
- Admin
- PIC
- Klien

See [docs/ROLES_AND_WORKFLOWS.md](docs/ROLES_AND_WORKFLOWS.md).

## Core Workflow

1. PIC logs in and creates a branding draft.
2. PIC selects an assigned Stockpoint and fills store/salesman data.
3. Location is attempted once through browser geolocation. If it fails, a validated Google Maps link can be entered manually.
4. Brandable stores upload required photos; new uploads are resized/compressed and stamped with the Hanzi Management field-documentation watermark in the browser before upload.
5. PIC submits the work as DONE.
6. Data can be reviewed, exported, synchronized to Spreadsheet, and reopened by Admin/Super Admin when required.

## Production Resources

- Supabase project ref: `mengddxsnoczoibuwmnr`
- GitHub repository: `relyondev/branding-ops-app`
- Vercel project: `relyondev/branding-ops-app`

IDs, endpoint URLs, and secrets must not be committed. Use the environment/secrets setup described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Local Development

```bash
npm install
npm run dev
```

Build validation:

```bash
npm run build
```

## Environment

Frontend only:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Never place Supabase service-role keys, HMAC secrets, Drive IDs, Spreadsheet IDs, or cron secrets in frontend environment variables.

## Database Migrations

Migrations are stored in `supabase/migrations/` and must be applied in numeric order. For this V1.5.2 package, an environment that already has migrations 001–024 applied only needs migration **025**. No migration 026 is required.

See [docs/DATABASE.md](docs/DATABASE.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roles & Workflows](docs/ROLES_AND_WORKFLOWS.md)
- [Database & Migrations](docs/DATABASE.md)
- [Integrations](docs/INTEGRATIONS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operations & Recovery](docs/OPERATIONS.md)
- [Security](docs/SECURITY.md)
- [QA Checklist](docs/QA_CHECKLIST.md)
- [V1 Final Lock](docs/V1_FINAL_LOCK.md)
- [Release Steps](docs/RELEASE_STEPS.md)
- [Changelog](CHANGELOG.md)

## Ownership

Development by Hanz Management in collaboration with Relyon.


## V1.1.0 Admin UX
Lihat CHANGELOG.md dan `supabase/migrations/022_admin_create_stockpoint.sql`.


## V1.2.0
Admin password reset, role create restriction, dark/light theme, and mobile responsive table cards.


### V1.2.1 hotfix
Desktop Data Pekerjaan table now preserves all columns with contained horizontal scrolling.


## V1.3.0 Frontend Rebrand
- HM Hanzi Management visual identity on login.
- Role color themes: PIC red, Admin/Super Admin charcoal, Client existing blue.
- Light is the default theme; dark remains available.
- PIC form autofills Stockpoint code segments into Store Code and Salesman ID.
- Chiller unavailable automatically marks the work as not brandable and skips photo requirements.
- Successful browser geolocation displays an inline map preview.
- PIC sidebar displays PIC full name and PIC ID.
- Data Pekerjaan shows Stockpoint ID before Stockpoint name.
- Photo viewer supports click-to-open modal preview.
- Reporting actions are separated into Sync Spreadsheet, Open Spreadsheet, and Export.

Backend follow-up: the new Salesman suffix UI allows `S` + up to 4 digits (5 characters total). Existing database validation must be updated before using 5-character suffixes in production.


### V1.3.1 frontend QA polish
Stockpoint-first form lock, clearer Salesman suffix UX, stable role theming, sidebar identity labels, HM branding placement, and navigable photo modal.


## V1.4.0
PIC Stockpoint assignment management and backend enforcement for Stockpoint-derived Kode Toko / ID Salesman are documented in `docs/V1_4_0_ASSIGNMENT_BACKEND.md`.


## V1.4.1
QA update: Manajemen User dan Manajemen PIC dipisah, chained filter assignment PIC, light-mode modal fix, dan Audit Log diaktifkan. Tidak ada migration baru.

### V1.4.3 QA polish
- White chart surfaces in all themes with high-contrast chart colors.
- Improved Audit Log modal, date range labels, and sortable headers.
