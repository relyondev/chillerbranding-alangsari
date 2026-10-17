# Branding Chiller

Production web application for Hanz Management / Relyon operations to manage Branding Chiller field work from PIC input through documentation, reporting, Google Drive storage, and Google Spreadsheet synchronization.

## Current Baseline

**V1.7.4 — repository cleanup baseline**

Runtime behavior is based on V1.7.3. V1.7.4 only normalizes repository structure, documentation, migration history notes, and version metadata; it does not intentionally change production business logic.

## Stack

- Astro + TypeScript + React
- Tailwind CSS + Poppins + Lucide React
- Supabase Auth / PostgreSQL / RPC / RLS / Edge Functions
- Google Apps Script
- Private Google Drive + Google Spreadsheet integration
- Vercel

## Roles

- Super Admin
- Admin
- PIC
- Klien

See [`docs/ROLES_AND_WORKFLOWS.md`](docs/ROLES_AND_WORKFLOWS.md).

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

Only browser-safe variables may use the `PUBLIC_` prefix:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Never commit `.env`, Supabase service-role keys, HMAC secrets, cron secrets, or private integration credentials. See [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md).

## Database

Production migration files are stored in `supabase/migrations/` and currently run through **029**.

Migration **014** is represented by a historical marker because the original manually applied Stockpoint seed SQL was not preserved in the repository. Existing production Stockpoint data is not modified by that marker. See [`docs/DATABASE.md`](docs/DATABASE.md).

Do **not** use `supabase db reset` against production.

## Edge Functions

Current source contains:

- `admin-create-user`
- `admin-reset-password`
- `integration-runner`
- `photo-upload`
- `photo-view`
- `reopen-submission`
- `spreadsheet-sync`

## Documentation

Current operational docs:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DATABASE.md`](docs/DATABASE.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md)
- [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md)
- [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md)
- [`docs/RELEASE_STEPS.md`](docs/RELEASE_STEPS.md)
- [`docs/ROLES_AND_WORKFLOWS.md`](docs/ROLES_AND_WORKFLOWS.md)
- [`docs/SALESMAN_IMPORT.md`](docs/SALESMAN_IMPORT.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/THEME_AND_MOBILE.md`](docs/THEME_AND_MOBILE.md)
- [`docs/USER_MANAGEMENT.md`](docs/USER_MANAGEMENT.md)
- [`docs/RELEASE_HISTORY.md`](docs/RELEASE_HISTORY.md)

Historical hotfix/release notes are retained under `docs/archive/` so the project root stays readable without deleting useful history.

## Production Resources

Repository and project identifiers may be documented, but credentials and secrets must remain outside Git.

- GitHub: `relyondev/branding-ops-app`
- Supabase project ref: `mengddxsnoczoibuwmnr`
- Vercel project: `relyondev/branding-ops-app`

## Ownership

Development by Hanz Management in collaboration with Relyon.

- [`docs/REPOSITORY_MAINTENANCE.md`](docs/REPOSITORY_MAINTENANCE.md)


## Current UI hotfix
Baseline package version: **1.7.5**. This release is frontend-only and does not require a database migration.
