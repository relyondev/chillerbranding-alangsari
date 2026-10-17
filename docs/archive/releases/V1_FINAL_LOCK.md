# V1 Final Lock

## Version

`1.0.3`

## Locked Scope

V1 includes:
- role-based authentication and navigation;
- PIC Stockpoint assignments;
- branding draft workflow;
- duplicate detection;
- optional browser geolocation with controlled manual Google Maps fallback;
- mandatory documentation by store/chiller condition;
- private Google Drive storage;
- Spreadsheet synchronization;
- reporting, XLSX/PDF export and Spreadsheet shortcut;
- Admin/Super Admin reopen workflow;
- Audit Log;
- account information page.

## Final Location Decision

Browser GPS is preferred but not mandatory.

The UI offers up to three failed geolocation attempts. Only after the third failure does the manual Maps input become available. A successful browser capture removes the need for a manual URL.

Manual Maps data is intentionally stored without fake/derived latitude or longitude values.

## Final Photo Upload Decision

Parallel upload must remain safe:
- UI merges successful photo state;
- server-side Drive folder creation is idempotent by submission;
- Apps Script locking prevents parallel folder races.

## Change Policy

After this release passes the final production smoke test, V1 behavior should not be changed except for critical bug fixes. Feature requests belong to a subsequent release line.
