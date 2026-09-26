-- READ ONLY VERIFY
select typname from pg_type where typname in ('photo_type','integration_job_status') order by typname;
select to_regclass('public.submission_photos') as submission_photos,to_regclass('public.integration_jobs') as integration_jobs;
select policyname,tablename from pg_policies where schemaname='public' and tablename in ('submission_photos','integration_jobs') order by tablename,policyname;
