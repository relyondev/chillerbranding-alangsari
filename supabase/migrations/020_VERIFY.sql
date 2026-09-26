-- 020_VERIFY.sql
-- READ ONLY VERIFY

-- 1) Exactly one report_submissions overload should remain.
select
  p.oid::regprocedure::text as function_signature,
  case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'report_submissions'
order by 1;

-- Expected exactly:
-- report_submissions(text,text,text,integer,integer) | DEFINER

-- 2) Verify current rows are still present.
select
  workflow_status,
  count(*) as total
from public.submissions
where deleted_at is null
group by workflow_status
order by workflow_status;

-- 3) Reopen fields exist.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'submissions'
  and column_name in ('reopen_reason', 'reopened_at')
order by column_name;
