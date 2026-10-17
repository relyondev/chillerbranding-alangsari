# v11.1 Role Loading Fix

Fixed:
- `RoleAwareSidebar` no longer indexes `menuByRole` while role is null.
- Neutral loading skeleton is shown until authenticated profile role resolves.
- Removed stale preview-mode references.
- Dashboard RPC output is normalized so `branch_counts`, `trend`, and `recent`
  are always arrays before `.map()` is called.
- Dashboard waits for a resolved role before initial data load.

No database migration.
No Edge Function redeploy.
