select column_name
from information_schema.columns
where table_schema='public'
  and table_name='submissions'
  and column_name in ('reopen_reason','reopened_at')
order by column_name;

select policyname
from pg_policies
where schemaname='public'
  and tablename='user_notifications'
order by policyname;

select p.proname,
       case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_type
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='finalize_reopen_submission';
