-- V1.7.1 dashboard timezone hardening + PIC bekerja metric
-- Additive / data-preserving. Existing rows are not rewritten.

-- New drafts should receive the calendar date in WIB, not the database server timezone.
alter table public.submissions
  alter column installation_date
  set default ((now() at time zone 'Asia/Jakarta')::date);

create or replace function public.dashboard_summary_v4(
  p_from date default null,
  p_to date default null
)
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
  with base_all as (
    select
      s.*,
      coalesce((s.submitted_at at time zone 'Asia/Jakarta')::date, s.installation_date) as dashboard_date
    from public.submissions s
    where s.deleted_at is null
      and s.workflow_status='done'
      and (v_role <> 'pic' or s.pic_user_id = v_uid)
  ),
  base as (
    select *
    from base_all
    where (p_from is null or dashboard_date >= p_from)
      and (p_to is null or dashboard_date <= p_to)
  ),
  brandable_base as (
    select * from base where branding_status='brandable'
  ),
  photos as (
    select
      b.id,
      bool_or(p.photo_type='store_before') filter(where p.is_active) store_before,
      bool_or(p.photo_type='chiller_before') filter(where p.is_active) chiller_before,
      bool_or(p.photo_type='chiller_after') filter(where p.is_active) chiller_after,
      bool_or(p.photo_type='wobbler_after') filter(where p.is_active) wobbler_after,
      bool_or(p.photo_type='poster_after') filter(where p.is_active) poster_after,
      bool_or(p.photo_type='spanduk_after') filter(where p.is_active) spanduk_after
    from brandable_base b
    left join public.submission_photos p
      on p.submission_id=b.id and p.is_active=true
    group by b.id
  ),
  branch_counts as (
    select
      case when v_role='pic' then stockpoint_name_snapshot else branch_name_snapshot end label,
      count(*)::int value
    from base
    group by 1
    order by 1
  ),
  trend as (
    select dashboard_date::text label, count(*)::int value
    from base
    group by dashboard_date
    order by dashboard_date
  )
  select jsonb_build_object(
    'total_visit', (select count(*) from base),
    'brandable', (select count(*) from base where branding_status='brandable'),
    'not_brandable', (select count(*) from base where branding_status='not_brandable'),
    'warung', (select count(*) from base where store_type='warung'),
    'grosir', (select count(*) from base where store_type='grosir'),
    'pic_working', (select count(distinct pic_user_id) from base where pic_user_id is not null),
    'brandable_photo_denominator', (select count(*) from brandable_base),
    'photo_store_before', (select count(*) from photos where coalesce(store_before,false)),
    'photo_chiller_before', (select count(*) from photos where coalesce(chiller_before,false)),
    'photo_chiller_after', (select count(*) from photos where coalesce(chiller_after,false)),
    'photo_wobbler_after', (select count(*) from photos where coalesce(wobbler_after,false)),
    'photo_poster_after', (select count(*) from photos where coalesce(poster_after,false)),
    'photo_spanduk_after', (select count(*) from photos where coalesce(spanduk_after,false)),
    'branch_counts', coalesce((select jsonb_agg(branch_counts) from branch_counts),'[]'::jsonb),
    'trend', coalesce((select jsonb_agg(trend) from trend),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_summary_v4(date,date) from public;
grant execute on function public.dashboard_summary_v4(date,date) to authenticated;
