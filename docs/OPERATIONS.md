# Operations and Recovery

## Normal Checks

- Login by each role.
- PIC Stockpoint assignments.
- Draft creation.
- Browser GPS and manual Maps fallback.
- Photo upload persistence.
- Drive folder hierarchy.
- Spreadsheet synchronization.
- Reporting/export.
- Reopen flow.

## Photo Upload Recovery

If an upload fails:
- keep the submission draft;
- reload Draft Saya;
- existing active photo records should remain visible;
- retry only missing slots.

Do not manually duplicate store folders. V1.0.1+ uses submission idempotency for folder creation.

## Integration Failure

Database remains the source of truth. Drive/Spreadsheet errors should be retried without recreating business submissions.

## Existing Duplicate Drive Folders

Folders created before the V1.0.1 idempotency hotfix should be reviewed manually. Do not mass-delete folders without checking the active database photo/file references.

## Release Discipline

- V1 is locked after final smoke test.
- Bug-only patch: V1.0.x
- Backward-compatible feature: V1.1.x
- Major workflow redesign: V2.x
