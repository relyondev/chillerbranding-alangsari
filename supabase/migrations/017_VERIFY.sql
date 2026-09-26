-- 017_VERIFY.sql
-- READ ONLY VERIFY

-- 1) Trigger must exist.
select
  tgname,
  tgenabled
from pg_trigger
where tgrelid = 'public.submissions'::regclass
  and tgname = 'submissions_spreadsheet_autosync'
  and not tgisinternal;

-- Expected: 1 row.

-- 2) Every current non-deleted submission should have at least one
-- spreadsheet_upsert integration job.
select
  s.id,
  s.store_name,
  s.workflow_status
from public.submissions s
where s.deleted_at is null
  and not exists (
    select 1
    from public.integration_jobs j
    where j.entity_id = s.id
      and j.job_type = 'spreadsheet_upsert'
  );

-- Expected: 0 rows.

-- 3) Queue status overview.
select
  status,
  count(*) as total
from public.integration_jobs
where job_type = 'spreadsheet_upsert'
group by status
order by status;
