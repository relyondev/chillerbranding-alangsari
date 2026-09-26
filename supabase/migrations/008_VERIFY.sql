-- READ ONLY VERIFY
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name='submit_submission';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='submission_photos';
