-- V1 Final location fallback verification
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema='public'
  and table_name='submissions'
  and column_name in ('latitude','longitude','location_accuracy_meters','location_captured_at','location_source','google_maps_url')
order by column_name;

select p.proname, pg_get_function_identity_arguments(p.oid) as signature
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('create_submission_draft','report_submissions')
order by p.proname, signature;
