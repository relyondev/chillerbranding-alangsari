begin;

drop function if exists public.report_submissions(text,text,public.branding_status,integer,integer);

create function public.report_submissions(
  p_search text default null,
  p_branch_code text default null,
  p_branding_status public.branding_status default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  id uuid,
  created_at timestamptz,
  installation_date date,
  branch_code text,
  branch_name text,
  stockpoint_code text,
  stockpoint_name text,
  pic_code text,
  pic_name text,
  salesman_code text,
  store_code text,
  store_name text,
  owner_name text,
  owner_phone text,
  store_address text,
  latitude numeric,
  longitude numeric,
  store_type public.store_type,
  has_chiller boolean,
  branding_status public.branding_status,
  not_brandable_reason text,
  workflow_status public.workflow_status,
  reopen_reason text,
  reopened_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select
    s.id,s.created_at,s.installation_date,
    s.branch_code_snapshot,s.branch_name_snapshot,
    s.stockpoint_code_snapshot,s.stockpoint_name_snapshot,
    s.pic_code_snapshot,s.pic_name_snapshot,
    s.salesman_code,s.store_code,s.store_name,
    s.owner_name,s.owner_phone,s.store_address,
    s.latitude,s.longitude,s.store_type,s.has_chiller,
    s.branding_status,s.not_brandable_reason,s.workflow_status,
    s.reopen_reason,s.reopened_at
  from public.submissions s
  where s.deleted_at is null
    and (
      public.current_app_role() <> 'pic'
      or s.pic_user_id = auth.uid()
    )
    and (
      p_search is null or p_search=''
      or s.store_name ilike '%'||p_search||'%'
      or s.owner_name ilike '%'||p_search||'%'
      or s.store_code ilike '%'||p_search||'%'
      or s.stockpoint_name_snapshot ilike '%'||p_search||'%'
    )
    and (
      p_branch_code is null or p_branch_code=''
      or s.branch_code_snapshot=p_branch_code
    )
    and (
      p_branding_status is null
      or s.branding_status=p_branding_status
    )
  order by s.created_at desc
  limit least(greatest(p_limit,1),500)
  offset greatest(p_offset,0);
$$;

revoke all on function public.report_submissions(text,text,public.branding_status,integer,integer) from public;
grant execute on function public.report_submissions(text,text,public.branding_status,integer,integer) to authenticated;

commit;
