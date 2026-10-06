do $$ begin
  if not exists (select 1 from pg_constraint where conname='location_accuracy_max_5m') then
    alter table public.submissions add constraint location_accuracy_max_5m check (location_accuracy_meters is null or location_accuracy_meters <= 5) not valid;
  end if;
end $$;

create or replace function public.dashboard_summary_v3(p_from date default null,p_to date default null)
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare v_role public.app_role:=public.current_app_role(); v_uid uuid:=auth.uid(); result jsonb;
begin
  with base as (
    select * from public.submissions s
    where s.deleted_at is null and s.workflow_status='done'
      and (v_role<>'pic' or s.pic_user_id=v_uid)
      and (p_from is null or s.installation_date>=p_from)
      and (p_to is null or s.installation_date<=p_to)
  ),
  brandable_base as (select * from base where branding_status='brandable'),
  photos as (
    select b.id,
      bool_or(p.photo_type='store_before') filter(where p.is_active) store_before,
      bool_or(p.photo_type='chiller_before') filter(where p.is_active) chiller_before,
      bool_or(p.photo_type='chiller_after') filter(where p.is_active) chiller_after,
      bool_or(p.photo_type='wobbler_after') filter(where p.is_active) wobbler_after,
      bool_or(p.photo_type='poster_after') filter(where p.is_active) poster_after,
      bool_or(p.photo_type='spanduk_after') filter(where p.is_active) spanduk_after
    from brandable_base b left join public.submission_photos p on p.submission_id=b.id and p.is_active=true group by b.id
  ),
  branch_counts as (
    select case when v_role='pic' then stockpoint_name_snapshot else branch_name_snapshot end label,count(*)::int value from base group by 1 order by 1
  ),
  trend as (
    select installation_date::text label,count(*)::int value from base group by installation_date order by installation_date
  )
  select jsonb_build_object(
    'total_visit',(select count(*) from base),'brandable',(select count(*) from base where branding_status='brandable'),'not_brandable',(select count(*) from base where branding_status='not_brandable'),
    'warung',(select count(*) from base where store_type='warung'),'grosir',(select count(*) from base where store_type='grosir'),'stockpoints_touched',(select count(distinct stockpoint_id) from base),
    'stockpoints_total',case when v_role='pic' then (select count(*) from public.pic_stockpoint_assignments where pic_user_id=v_uid and is_active=true) else (select count(*) from public.stockpoints where is_active=true) end,
    'brandable_photo_denominator',(select count(*) from brandable_base),'photo_store_before',(select count(*) from photos where coalesce(store_before,false)),'photo_chiller_before',(select count(*) from photos where coalesce(chiller_before,false)),
    'photo_chiller_after',(select count(*) from photos where coalesce(chiller_after,false)),'photo_wobbler_after',(select count(*) from photos where coalesce(wobbler_after,false)),'photo_poster_after',(select count(*) from photos where coalesce(poster_after,false)),'photo_spanduk_after',(select count(*) from photos where coalesce(spanduk_after,false)),
    'branch_counts',coalesce((select jsonb_agg(branch_counts) from branch_counts),'[]'::jsonb),'trend',coalesce((select jsonb_agg(trend) from trend),'[]'::jsonb)
  ) into result;
  return result;
end;$$;
revoke all on function public.dashboard_summary_v3(date,date) from public;
grant execute on function public.dashboard_summary_v3(date,date) to authenticated;
