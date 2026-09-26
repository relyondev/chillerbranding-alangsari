# v11 General Revision

Implemented:
- No Super Admin menu flash while role is loading; neutral sidebar skeleton instead.
- Toast/popout infrastructure added for user feedback.
- PIC form validation:
  - owner name helper text
  - phone starts with 08, minimum 9 digits, numeric-only
  - address minimum 20 characters
  - Wobbler/Poster/Spanduk display names no longer use "After"
- Dashboard has separate Brandable and Non-brandable recent sections, 10 items/page.
- Reopen reason stored on submission.
- PIC notification bell receives reopen notifications and reason.
- PIC work view splits Draft vs Reopen.
- Reporting RPC now exposes workflow_status / reopen_reason / reopened_at.
- Apply button removed where present; filters are intended to react immediately.
- Reset and Refresh remain.
- Existing non-brandable Spreadsheet behavior is not forced into immediate sync.

Migrations:
1. `018_reopen_notifications.sql`
2. `018_VERIFY.sql`
3. `019_reporting_reopen_fields.sql`
4. `019_VERIFY.sql`

Logo:
- Exact final Branding logo asset was not identifiable in the current source.
- Drop final files into `public/branding-logo.png` and `public/favicon.png`.

Hardening items remain for the later production-hardening pass:
- strict route guard per role
- remove development preview fallback everywhere
- tighter client profile RLS
- reopen recovery/reconciliation
- full export beyond current fetch limits
- complete mobile QA
