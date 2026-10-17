# V1.6.1 Hotfix + Salesman Seed

## Reporting hotfix

`Stockpoint Terjamah` in XLSX/PDF Summary now calculates a percentage. The touched count follows the currently filtered DONE rows. The denominator is the active Stockpoint master for the selected Branch; when Branch is `Semua Branch`, all active Stockpoints are used.

## Salesman seed

Run only after migration `026_salesman_admin_edit_dashboard.sql` has succeeded.

File:

`supabase/seeds/seed_salesmen_client_master.sql`

Behavior:
- Source contains 1,616 code/name pairs.
- Stockpoint is derived from the first two code segments.
- Only rows whose Stockpoint already exists and is active are inserted.
- `SX00` rows are treated as Stockpoint marker rows and skipped.
- `VACANT` rows are skipped so PIC autocomplete does not show a fake Salesman.
- Existing active Salesman with the same Stockpoint + suffix is preserved (`DO NOTHING`).
- Missing Stockpoints are reported and can be imported later by rerunning the same seed after the Stockpoint master is expanded.

On the current 273-Stockpoint master used to prepare this package, the source analysis found 470 rows referencing an existing Stockpoint. After excluding 22 matching `SX00` marker rows and 14 matching `VACANT` placeholders, 434 rows are currently importable. The SQL itself recalculates these counts against the live database at runtime, so the live result is authoritative.
