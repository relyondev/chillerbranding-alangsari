-- READ ONLY VERIFY
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','branches','stockpoints','pic_profiles','pic_stockpoint_assignments')
order by tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
