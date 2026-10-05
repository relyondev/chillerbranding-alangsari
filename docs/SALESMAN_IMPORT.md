# Import Master Salesman (disiapkan untuk dataset ±1.600 baris)

Belum ada seed salesman pada V1.6.0 karena dataset final belum diberikan.

Format minimum yang dibutuhkan nanti:

- Branch / branch code
- Stockpoint code
- ID Salesman / suffix Salesman
- Nama Salesman

Flow import yang disarankan:

1. Normalize Stockpoint code dan Salesman code.
2. Resolve `stockpoint_id` dari master Stockpoint existing.
3. Upsert ke `public.salesmen` dengan unique key Stockpoint + suffix.
4. Backfill `submissions.salesman_id` dan `salesman_name_snapshot` hanya jika kombinasi historical `stockpoint_id + salesman_code` cocok.
5. Jangan overwrite `submissions.salesman_code` historical.
6. VERIFY jumlah import, duplicate code per Stockpoint, dan unmatched rows.

Ketika file 1.600 salesman sudah tersedia, generate migration/seed khusus dari data tersebut daripada melakukan input manual satu per satu.
