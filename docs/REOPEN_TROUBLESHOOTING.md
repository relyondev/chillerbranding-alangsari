# Reopen Troubleshooting

The `reopen-submission` Edge Function uses two DB RPCs:

1. `begin_reopen_submission(uuid, uuid, text)`
2. `finalize_reopen_submission(uuid, uuid, text)`

It also deletes active Drive photo files before finalizing the reopen.

## Expected behavior

- Only active `admin` / `super_admin` actors can reopen.
- Submission must currently be `done`.
- Reason is required.
- Active Drive photos are deleted.
- Submission returns to `draft`.
- Existing active photo rows become inactive.
- Reopen metadata is populated.

## Useful verification SQL

```sql
select
  id,
  store_name,
  workflow_status,
  operation_lock,
  reopen_count,
  reopen_reason,
  reopened_at,
  drive_store_folder_id
from public.submissions
order by updated_at desc
limit 20;
```

```sql
select
  p.submission_id,
  p.photo_type,
  p.is_active,
  p.drive_file_id
from public.submission_photos p
where p.submission_id = '<SUBMISSION_ID>'
order by p.created_at;
```

```sql
select routine_name, routine_schema
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('begin_reopen_submission','finalize_reopen_submission')
order by routine_name;
```

If a retry returns `operation_lock = reopening`, retrying the Edge Function is safe because Drive deletion is idempotent.
