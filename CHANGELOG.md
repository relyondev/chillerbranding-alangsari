# V1.7.1

- Dashboard period selector now has a clear `Pilih Periode` label and cleaner alignment.
- Removed redundant Dashboard title/subtitle duplication inside the dashboard body; active period is now the primary header context.
- Removed manual refresh button because period changes already trigger automatic reload.
- `Seluruh` displays the date range from the first completed submission through today.
- Other period presets display their resolved calendar range.
- Dashboard period calculations now use `submitted_at` converted to `Asia/Jakarta` (WIB), fixing early-morning submissions being grouped into the previous UTC date.
- New submissions default `installation_date` using the WIB calendar date.
- Replaced `Stockpoint Terjamah` KPI with `PIC Bekerja` (distinct PIC with DONE submissions in the active period).
- Today sections and PIC monthly counts now use WIB completion date consistently.
