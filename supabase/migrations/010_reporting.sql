begin;

create or replace function public.report_submissions(
  p_search text default null,
  p_branch_code text default null,
  p_branding_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,installation_date date,branch_name text,branch_code text,stockpoint_name text,stockpoint_code text,
  pic_code text,pic_name text,salesman_code text,store_code text,store_name text,owner_name text,owner_phone text,
  store_address text,latitude numeric,longitude numeric,store_type public.store_type,has_chiller boolean,
  branding_status public.branding_status,not_brandable_reason text,workflow_status public.workflow_status,submitted_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select s.id,s.installation_date,s.branch_name_snapshot,s.branch_code_snapshot,s.stockpoint_name_snapshot,s.stockpoint_code_snapshot,
    s.pic_code_snapshot,s.pic_name_snapshot,s.salesman_code,s.store_code,s.store_name,s.owner_name,s.owner_phone,s.store_address,
    s.latitude,s.longitude,s.store_type,s.has_chiller,s.branding_status,s.not_brandable_reason,s.workflow_status,s.submitted_at
  from public.submissions s
  where s.deleted_at is null
    and (public.current_app_role()<>'pic' or s.pic_user_id=auth.uid())
    and (p_branch_code is null or s.branch_code_snapshot=p_branch_code)
    and (p_branding_status is null or s.branding_status::text=p_branding_status)
    and (p_search is null or concat_ws(' ',s.store_code,s.store_name,s.owner_name,s.owner_phone,s.salesman_code,s.pic_name_snapshot) ilike '%'||p_search||'%')
  order by s.created_at desc
  limit greatest(1,least(p_limit,500)) offset greatest(p_offset,0)
$$;

create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_role public.app_role:=public.current_app_role(); v_uid uuid:=auth.uid(); result jsonb;
begin
  with base as (
    select * from public.submissions s where s.deleted_at is null and (v_role<>'pic' or s.pic_user_id=v_uid)
  ),
  branch_counts as (
    select case when v_role='pic' then stockpoint_name_snapshot else branch_name_snapshot end label,count(*) value from base group by 1 order by 1
  ),
  trend as (
    select installation_date::text label,count(*) value from base where installation_date>=current_date-interval '13 days' group by installation_date order by installation_date
  ),
  recent as (
    select jsonb_agg(x) arr from (
      select id,installation_date,branch_name_snapshot branch_name,stockpoint_name_snapshot stockpoint_name,store_name,pic_name_snapshot pic_name,branding_status
      from base order by created_at desc limit 10
    ) x
  )
  select jsonb_build_object(
    'total',(select count(*) from base),
    'brandable',(select count(*) from base where branding_status='brandable'),
    'not_brandable',(select count(*) from base where branding_status='not_brandable'),
    'drafts',(select count(*) from base where workflow_status='draft'),
    'pic_active',(select count(*) from public.profiles where role='pic' and is_active=true),
    'stockpoints',(select count(*) from public.stockpoints where is_active=true),
    'branch_counts',coalesce((select jsonb_agg(branch_counts) from branch_counts),'[]'::jsonb),
    'trend',coalesce((select jsonb_agg(trend) from trend),'[]'::jsonb),
    'recent',coalesce((select arr from recent),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.report_submissions(text,text,text,integer,integer) from public;
revoke all on function public.dashboard_summary() from public;
grant execute on function public.report_submissions(text,text,text,integer,integer) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;

commit;
