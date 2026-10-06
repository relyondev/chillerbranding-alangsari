-- V1.7.1 verify
select column_default
from information_schema.columns
where table_schema='public'
  and table_name='submissions'
  and column_name='installation_date';

select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='dashboard_summary_v4';

-- Run while authenticated in the app / SQL environment that can assume an app user if needed:
-- select public.dashboard_summary_v4(null,null);
