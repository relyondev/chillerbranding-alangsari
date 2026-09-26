-- READ ONLY VERIFY
select to_regclass('public.audit_events') as audit_events;
select policyname, cmd from pg_policies where schemaname='public' and tablename='audit_events';
