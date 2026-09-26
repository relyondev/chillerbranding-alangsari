# Photo upload + Draft Resume fix

## Photo upload
`invalid_google_response` means the Supabase Edge Function received a non-JSON response from the Apps Script endpoint.

Most likely deployment cause:
- Apps Script Web App is not publicly callable by the server.
- Opening `/exec` in a browser can still work if the browser is logged into Google.

Required Apps Script deployment:
- Execute as: Me
- Who has access: Anyone
- Use the `/exec` URL from that deployment in `APPS_SCRIPT_ENDPOINT`.

Source fixes:
- Correct HMAC string in `Code.gs`: `branding-ops\n`.
- Google response parser now reads text first and surfaces HTTP status, content type and a short body preview if Google returns HTML/non-JSON.

After updating Apps Script:
1. Save `Code.gs`.
2. Deploy > Manage deployments > Edit > New version > Deploy.
3. Keep access = Anyone.
4. If the deployment URL changes, update `APPS_SCRIPT_ENDPOINT` Supabase secret.
5. Redeploy `photo-upload`.

## Draft resume
- `Draft Saya` now has a `Lanjutkan` action.
- Continue opens `/app/submissions?draft=<submission-id>`.
- Input Branding loads the existing PIC-owned draft instead of creating a new draft.
- Existing active photos are detected from `submission_photos`.
- Only missing photos need to be uploaded.
- Main draft fields remain locked after draft creation.

No database migration is required.
