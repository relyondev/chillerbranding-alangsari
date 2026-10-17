# Branding Ops App — Review Bundle Phase 1–6

## Included
### Phase 1 — Frontend Bootstrap Final
- Relyon palette + Poppins
- Approved two-column login layout
- Desktop sidebar + mobile drawer
- Role-aware preview controller centralized client-side
- Dashboard skeleton

### Phase 2 — Database Foundation
- Migration 001 foundation
- Migration 002 RLS/security foundation
- READ-ONLY VERIFY scripts for each migration

### Phase 3 — Authentication
- Supabase email/password login
- Forgot password
- Reset password
- Auth service
- Change password/email service functions
- No service-role in frontend

### Phase 4 — Master Data & User Foundation
- Branch master seeded:
  - BGR / Bogor
  - SMG / Semarang
  - YOG / Yogyakarta
  - SBY / Surabaya
  - MLG / Malang
- Stockpoint master table
- PIC profile + per-branch sequence
- PIC-to-stockpoint assignment model
- One active PIC per stockpoint constraint
- User management UI scaffold
- Admin-create-user Edge Function scaffold (not production-complete yet)

### Phase 5 — Submission Core
- Submission data model
- Salesman code validations: `NNNN/NNN/Axx...`
- Store code 3–4 digits
- Browser geolocation UI
- Warung/Grosir
- Chiller yes/no
- Brandable/not-brandable flow
- Snapshot fields for historical reporting
- Draft/done workflow

### Phase 6 — Duplicate Engine
- Normalized store name
- Normalized owner name
- Normalized phone
- Stockpoint
- >= 3 of 4 match => hard reject
- Server-side duplicate check in create and submit RPC

## Intentionally NOT included yet
- Photo upload / Google Drive write
- Photo requirement validation in submit RPC
- Reopen + Drive cleanup
- Google Sheet sync
- Real dashboard chart queries
- Export PDF/XLSX
- Production deployment

## Migration order
Run only in the NEW Supabase project:
1. `001_foundation.sql`
2. `001_VERIFY.sql` (read-only)
3. `002_security_foundation.sql`
4. `002_VERIFY.sql`
5. `003_submission_core.sql`
6. `003_VERIFY.sql`
7. `004_submission_rpc_duplicate.sql`
8. `004_VERIFY.sql`
9. `005_audit_foundation.sql`
10. `005_VERIFY.sql`

Do NOT run any legacy migrations.
