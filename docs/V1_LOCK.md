# Branding Ops App — V1 Lock Candidate

This package is intended as the final V1 candidate.

Final polish included:
- Input Branding layout cleanup.
- Account page reads actual logged-in profile data.
- Change email/password controls hidden for V1.
- Audit Log reads existing `audit_events`.
- Reporting actions reduced to:
  - Export (XLSX / PDF dropdown)
  - Sync Spreadsheet
- Export uses the currently filtered dataset.
- Login page compacted and cleaned up.
- No new database migration in this package.

V1 scope is considered functionally locked after final smoke testing.
Future changes should be versioned as V1.1 / V2 rather than silently changing V1 behavior.
