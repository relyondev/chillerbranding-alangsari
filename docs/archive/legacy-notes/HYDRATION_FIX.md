# Hydration Fix

Fixed React/Astro hydration mismatch in the role-aware navigation.

Cause:
- `RoleAwareSidebar` read `window.location.pathname` during the initial browser render.
- SSR cannot access `window`, so the server generated an inactive link while the browser generated an active link.
- `useAppRole` also derived its initial state from `window.location.search` in the browser but not on the server.

Fix:
- Sidebar pathname now starts with a deterministic empty value and is resolved in `useEffect`.
- `useAppRole` now starts with a deterministic `super_admin` value and resolves the authenticated/preview role after hydration.
- Server and initial browser markup now match.

No database migration.
No Edge Function redeploy required.
