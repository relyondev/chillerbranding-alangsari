# Apply V1.7.2

Overlay this package on the current V1.7.1 repository.

1. Run `supabase/migrations/029_location_accuracy_50m.sql` in Supabase SQL Editor.
2. Run `supabase/migrations/029_VERIFY.sql` and confirm only `location_accuracy_max_50m` remains.
3. Run `npm install` only if dependencies are not installed yet.
4. Run `npm run build`.
5. QA on a real phone:
   - tap Ambil Lokasi;
   - while locating, only spinner/loading should be visible;
   - a fix <=50m should open the Leaflet map;
   - dragging <=3m should be accepted;
   - dragging >3m should snap back / be rejected;
   - submit should save successfully.

No Edge Function redeploy is required.
