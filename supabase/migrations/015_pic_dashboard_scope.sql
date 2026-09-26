begin;

create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_uid uuid := auth.uid();
  result jsonb;
begin
  with base as (
    select *
    from public.submissions s
    where s.deleted_at is null
      and (
        v_role <> 'pic'
        or s.pic_user_id = v_uid
      )
  ),
  pic_stockpoints as (
    select
      sp.id,
      sp.name,
      sp.code
    from public.pic_stockpoint_assignments psa
    join public.stockpoints sp
      on sp.id = psa.stockpoint_id
    where psa.pic_user_id = v_uid
      and psa.is_active = true
      and sp.is_active = true
  ),
  branch_counts as (
    select
      x.label,
      x.value
    from (
      select
        ps.name as label,
        count(b.id)::bigint as value
      from pic_stockpoints ps
      left join base b
        on b.stockpoint_id = ps.id
      where v_role = 'pic'
      group by ps.id, ps.name, ps.code

      union all

      select
        b.branch_name_snapshot as label,
        count(*)::bigint as value
      from base b
      where v_role <> 'pic'
      group by b.branch_name_snapshot
    ) x
    order by x.label
  ),
  trend as (
    select
      installation_date::text as label,
      count(*)::bigint as value
    from base
    where installation_date >= current_date - interval '13 days'
    group by installation_date
    order by installation_date
  ),
  recent as (
    select jsonb_agg(x) as arr
    from (
      select
        id,
        installation_date,
        branch_name_snapshot as branch_name,
        stockpoint_name_snapshot as stockpoint_name,
        store_name,
        pic_name_snapshot as pic_name,
        branding_status
      from base
      order by created_at desc
      limit 10
    ) x
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'brandable', (select count(*) from base where branding_status='brandable'),
    'not_brandable', (select count(*) from base where branding_status='not_brandable'),
    'drafts', (select count(*) from base where workflow_status='draft'),
    'pic_active',
      case
        when v_role='pic' then 1
        else (select count(*) from public.profiles where role='pic' and is_active=true)
      end,
    'stockpoints',
      case
        when v_role='pic'
          then (select count(*) from pic_stockpoints)
        else (select count(*) from public.stockpoints where is_active=true)
      end,
    'branch_counts',
      coalesce((select jsonb_agg(branch_counts) from branch_counts), '[]'::jsonb),
    'trend',
      coalesce((select jsonb_agg(trend) from trend), '[]'::jsonb),
    'recent',
      coalesce((select arr from recent), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.dashboard_summary() from public;
grant execute on function public.dashboard_summary() to authenticated;

commit;
