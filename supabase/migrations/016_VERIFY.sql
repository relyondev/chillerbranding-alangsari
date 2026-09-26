-- 016_VERIFY.sql
-- READ ONLY VERIFY

-- 1) Confirm the new CHECK constraint exists.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.submissions'::regclass
  and conname = 'store_code_format';

-- Expected regex:
-- ^\d{4}/\d{3}/\d{3,4}$

-- 2) Existing rows must all match the new format.
select
  id,
  store_code
from public.submissions
where deleted_at is null
  and store_code !~ '^\d{4}/\d{3}/\d{3,4}$';

-- Expected: 0 rows.

-- 3) RPCs must remain SECURITY DEFINER.
select
  p.proname,
  case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_submission_draft',
    'admin_update_reopened_submission'
  )
order by p.proname;

-- Expected: both DEFINER.
