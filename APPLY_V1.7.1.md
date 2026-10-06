# Apply V1.7.1 Dashboard WIB Hotfix

1. Overlay package files into the existing V1.7.0 repo.
2. In Supabase SQL Editor run `supabase/migrations/028_dashboard_wib_pic_working.sql`.
3. Run `supabase/migrations/028_VERIFY.sql`.
4. Run:
   ```powershell
   npm install
   npm run build
   ```
5. QA Dashboard:
   - Default period = Seluruh.
   - Header shows actual active date range.
   - Hari Ini includes submissions completed after midnight WIB, including early-morning jobs.
   - Card `PIC Bekerja` counts distinct PIC with DONE submissions in the chosen period.
   - Changing period auto-refreshes without a refresh button.
6. Push GitHub.

No Edge Function changes.
