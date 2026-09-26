-- READ ONLY VERIFY
select
  to_regclass('public.submissions') as submissions;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'submissions'
order by ordinal_position;

select policyname, cmd
from pg_policies
where schemaname='public' and tablename='submissions';
