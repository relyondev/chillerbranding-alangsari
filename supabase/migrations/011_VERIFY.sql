-- READ ONLY VERIFY
select indexname from pg_indexes where schemaname='public' and tablename in ('integration_jobs','submission_photos') order by indexname;
select routine_name from information_schema.routines where routine_schema='public' and routine_name in ('claim_integration_jobs','finish_integration_job') order by routine_name;
