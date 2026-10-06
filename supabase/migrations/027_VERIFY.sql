select routine_name from information_schema.routines where routine_schema='public' and routine_name='dashboard_summary_v3';
select public.dashboard_summary_v3(null,null) is not null as dashboard_summary_v3_ok;

select conname, convalidated from pg_constraint where conname='location_accuracy_max_5m';
