# Sistem Operasional Branding Warung

Production web application for Relyon Production to manage warung branding field operations from PIC input through documentation, reporting, Google Drive storage, and Google Spreadsheet synchronization.

## Release

**V1 Final Lock — 1.1.0**

This release is the locked V1 baseline. New features should be developed as V1.1+ or V2 rather than changing the V1 workflow silently.

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
3. Location is captured from browser geolocation. After three failed attempts, a validated Google Maps link can be entered manually.
4. Brandable stores upload required photos.
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

Migrations are stored in `supabase/migrations/` and must be applied in numeric order. Existing production databases that already have 001–020 applied only need migration **021** for the final location fallback behavior.

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

© 2026 Sistem Operasional Branding Warung. Made with ♥ by RELYON PRODUCTION.


## V1.1.0 Admin UX
Lihat CHANGELOG.md dan `supabase/migrations/022_admin_create_stockpoint.sql`.


## V1.2.0
Admin password reset, role create restriction, dark/light theme, and mobile responsive table cards.
