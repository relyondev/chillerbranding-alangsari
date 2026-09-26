# V1.0.2 Release Steps

For the current production stack:

1. Back up current source/database/Apps Script deployment.
2. Apply `supabase/migrations/021_optional_geolocation_manual_maps.sql`.
3. Run `supabase/migrations/021_VERIFY.sql`.
4. Deploy frontend source to GitHub `main`; Vercel builds from it.
5. Redeploy Edge Functions that consume shared Spreadsheet mapping:
   - `spreadsheet-sync`
   - `integration-runner`
6. Ensure the V1.0.1 `photo-upload` function and Apps Script idempotency hotfix are also deployed. If uncertain, redeploy `photo-upload` and the included `google-apps-script/Code.gs`.
7. Smoke test both browser-location success and 3-failure manual Maps fallback.
8. Smoke test multiple concurrent photo uploads and verify only one Stockpoint/store folder is created per task.
9. Run the full `QA_CHECKLIST.md`.
10. Tag Git only after production passes QA.


### V1.2.0 Edge Function
Deploy: `supabase functions deploy admin-reset-password --project-ref mengddxsnoczoibuwmnr`
