# V1.4.2 Audit / Assignment / Chart QA

## Audit Log
- Filters: text search, user, event/action, from date, to date.
- Event options are derived from actual audit rows.
- Columns: Waktu, Aksi, User, Role, Entity, Detail, ID Entity.
- Role labels are color coded.
- Detail resolves related submission/store/stockpoint/PIC context when available, with a modal for before/after JSON.
- Pagination: 20 / 50 / 100 only.

## PIC Stockpoint assignment UX
- Currently assigned Stockpoints stay at the top and show `Sudah di-assign`.
- Existing assignments with work retain `Ada pekerjaan · tidak bisa dilepas`.
- Newly checked Stockpoints immediately move to the selected group and show `Baru dipilih`.
- Ordering updates without waiting for Save.

## Chart contrast
- Chart.js canvas colors are now read from the active role/theme CSS variables.
- Axis labels, grid lines, legends, bar/doughnut/line colors update when light/dark mode or role changes.
