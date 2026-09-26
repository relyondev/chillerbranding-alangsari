# V1.0.1 Photo Upload Hotfix

Production bug fixed without a database migration.

## Symptoms fixed
- Concurrent photo uploads could create duplicate Stockpoint / store folders in Google Drive.
- One submission could create multiple store folders when several photos started before `drive_store_folder_id` was persisted.
- A photo tile could revert from “Sudah tersimpan” to “upload required” after another concurrent upload completed.

## Root causes
1. Google Apps Script folder creation used a check-then-create flow without a lock/idempotency key.
2. Each concurrent upload could see a null `drive_store_folder_id` and create its own store folder.
3. `PhotoUploader` used stale React state during concurrent uploads; later responses could overwrite earlier successful slots.
4. The existing-photo effect depended on an unstable `onComplete` callback and could re-fetch unnecessarily.

## Changes
- Apps Script now uses `LockService` while resolving Branch / Stockpoint / PIC / Store folders.
- Store folders are idempotently keyed by `submissionId` through Script Properties plus a Drive folder description marker.
- `photo-upload` now sends `submissionId` to Apps Script.
- Frontend upload completion state is merged through a ref instead of stale closure state.
- Existing-photo hydration no longer re-runs just because the parent callback identity changes.

## Deployment required
1. Update and redeploy `google-apps-script/Code.gs` as a new Web App version (same execution/access policy).
2. Keep the current Web App URL if updating the same deployment; if the URL changes, update Supabase secret `APPS_SCRIPT_ENDPOINT`.
3. Redeploy Supabase Edge Function: `photo-upload`.
4. Push frontend source and let Vercel redeploy.

No SQL migration is required.

Existing duplicate Drive folders/files from earlier failed tests are not automatically deleted by this hotfix. Clean those test artifacts manually after confirming the corresponding submission data.
