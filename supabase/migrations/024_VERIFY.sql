-- Verify Branding Chiller V1.4.0 backend rules.
select
  to_regprocedure('public.admin_get_pic_stockpoint_options(uuid)') as get_assignment_options,
  to_regprocedure('public.admin_set_pic_stockpoint_assignments(uuid,uuid[])') as set_assignments,
  to_regprocedure('public.create_submission_draft(uuid,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,store_type,boolean,branding_status,text)') as create_draft;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.submissions'::regclass
  and conname in ('salesman_part_3_format','location_capture_rule')
order by conname;
