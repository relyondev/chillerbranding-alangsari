begin;

-- V1 final: browser geolocation is preferred but may fall back to a manually
-- supplied Google Maps URL after the client exhausts its retry flow.

alter table public.submissions
  add column if not exists google_maps_url text;

alter table public.submissions
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column location_accuracy_meters drop not null,
  alter column location_captured_at drop not null;

alter table public.submissions
  drop constraint if exists location_capture_rule;

alter table public.submissions
  add constraint location_capture_rule check (
    (
      location_source = 'browser_geolocation'
      and latitude is not null
      and longitude is not null
      and location_accuracy_meters is not null
      and google_maps_url is null
    )
    or
    (
      location_source = 'manual_google_maps'
      and latitude is null
      and longitude is null
      and location_accuracy_meters is null
      and google_maps_url is not null
      and length(trim(google_maps_url)) > 0
    )
  );

-- Drop the previous RPC signature before adding the Google Maps URL argument,
-- avoiding PostgREST overload ambiguity.
drop function if exists public.create_submission_draft(
  uuid,text,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,
  public.store_type,boolean,public.branding_status,text
);

create function public.create_submission_draft(
  p_stockpoint_id uuid,
  p_salesman_part_1 text,
  p_salesman_part_2 text,
  p_salesman_part_3 text,
  p_salesman_code text,
  p_store_code text,
  p_store_name text,
  p_owner_name text,
  p_owner_phone text,
  p_store_address text,
  p_latitude numeric,
  p_longitude numeric,
  p_location_accuracy_meters numeric,
  p_google_maps_url text,
  p_store_type public.store_type,
  p_has_chiller boolean,
  p_branding_status public.branding_status,
  p_not_brandable_reason text
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_pic public.pic_profiles;
  v_branch public.branches;
  v_stockpoint public.stockpoints;
  v_result public.submissions;
  v_manual_url text := nullif(trim(p_google_maps_url), '');
  v_location_source text;
begin
  select * into v_profile
  from public.profiles
  where id = v_user and is_active = true;

  if v_profile.id is null or v_profile.role <> 'pic' then
    raise exception 'pic_required';
  end if;

  select * into v_pic
  from public.pic_profiles
  where user_id = v_user;

  if v_pic.user_id is null then
    raise exception 'pic_profile_missing';
  end if;

  select * into v_stockpoint
  from public.stockpoints
  where id = p_stockpoint_id and is_active = true;

  if v_stockpoint.id is null then
    raise exception 'stockpoint_not_found';
  end if;

  if not exists (
    select 1
    from public.pic_stockpoint_assignments a
    where a.pic_user_id = v_user
      and a.stockpoint_id = p_stockpoint_id
      and a.is_active = true
  ) then
    raise exception 'stockpoint_not_assigned';
  end if;

  select * into v_branch
  from public.branches
  where id = v_pic.branch_id;

  if v_stockpoint.branch_id <> v_pic.branch_id then
    raise exception 'branch_mismatch';
  end if;

  if p_salesman_part_1 !~ '^\d{4}$'
    or p_salesman_part_2 !~ '^\d{3}$'
    or upper(p_salesman_part_3) !~ '^[A-Z][A-Z0-9]{2,3}$'
    or p_salesman_code <>
       p_salesman_part_1 || '/' ||
       p_salesman_part_2 || '/' ||
       upper(p_salesman_part_3)
  then
    raise exception 'invalid_salesman_code';
  end if;

  if p_store_code !~ '^\d{4}/\d{3}/\d{3,4}$' then
    raise exception 'invalid_store_code';
  end if;

  if p_latitude is not null or p_longitude is not null or p_location_accuracy_meters is not null then
    if p_latitude is null or p_longitude is null or p_location_accuracy_meters is null then
      raise exception 'incomplete_browser_geolocation';
    end if;
    if v_manual_url is not null then
      raise exception 'choose_single_location_source';
    end if;
    v_location_source := 'browser_geolocation';
  elsif v_manual_url is not null then
    v_location_source := 'manual_google_maps';
  else
    raise exception 'location_required';
  end if;

  perform public.assert_no_duplicate_submission(
    p_store_name,
    p_owner_name,
    p_owner_phone,
    p_stockpoint_id,
    null
  );

  insert into public.submissions(
    pic_user_id,
    pic_code_snapshot,
    pic_name_snapshot,
    branch_id,
    branch_code_snapshot,
    branch_name_snapshot,
    stockpoint_id,
    stockpoint_code_snapshot,
    stockpoint_name_snapshot,
    salesman_code_part_1,
    salesman_code_part_2,
    salesman_code_part_3,
    salesman_code,
    store_code,
    store_name,
    store_name_normalized,
    owner_name,
    owner_name_normalized,
    owner_phone,
    owner_phone_normalized,
    store_address,
    latitude,
    longitude,
    location_accuracy_meters,
    location_captured_at,
    location_source,
    google_maps_url,
    store_type,
    has_chiller,
    branding_status,
    not_brandable_reason
  )
  values (
    v_user,
    v_pic.pic_code,
    v_profile.full_name,
    v_branch.id,
    v_branch.code,
    v_branch.name,
    v_stockpoint.id,
    v_stockpoint.code,
    v_stockpoint.name,
    p_salesman_part_1,
    p_salesman_part_2,
    upper(p_salesman_part_3),
    p_salesman_code,
    p_store_code,
    trim(p_store_name),
    public.normalize_business_text(p_store_name),
    trim(p_owner_name),
    public.normalize_business_text(p_owner_name),
    p_owner_phone,
    public.normalize_phone(p_owner_phone),
    trim(p_store_address),
    case when v_location_source = 'browser_geolocation' then p_latitude else null end,
    case when v_location_source = 'browser_geolocation' then p_longitude else null end,
    case when v_location_source = 'browser_geolocation' then p_location_accuracy_meters else null end,
    case when v_location_source = 'browser_geolocation' then now() else null end,
    v_location_source,
    case when v_location_source = 'manual_google_maps' then v_manual_url else null end,
    p_store_type,
    p_has_chiller,
    p_branding_status,
    case
      when p_branding_status = 'not_brandable'
        then trim(p_not_brandable_reason)
      else null
    end
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_submission_draft(
  uuid,text,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,text,
  public.store_type,boolean,public.branding_status,text
) from public;

grant execute on function public.create_submission_draft(
  uuid,text,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,text,
  public.store_type,boolean,public.branding_status,text
) to authenticated;

-- Keep reporting canonical with the new manual Maps field.
drop function if exists public.report_submissions(
  text,
  text,
  text,
  integer,
  integer
);

create function public.report_submissions(
  p_search text default null,
  p_branch_code text default null,
  p_branding_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,
  created_at timestamptz,
  installation_date date,
  branch_name text,
  branch_code text,
  stockpoint_name text,
  stockpoint_code text,
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
  google_maps_url text,
  location_source text,
  store_type public.store_type,
  has_chiller boolean,
  branding_status public.branding_status,
  not_brandable_reason text,
  workflow_status public.workflow_status,
  submitted_at timestamptz,
  reopen_reason text,
  reopened_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select
    s.id,
    s.created_at,
    s.installation_date,
    s.branch_name_snapshot,
    s.branch_code_snapshot,
    s.stockpoint_name_snapshot,
    s.stockpoint_code_snapshot,
    s.pic_code_snapshot,
    s.pic_name_snapshot,
    s.salesman_code,
    s.store_code,
    s.store_name,
    s.owner_name,
    s.owner_phone,
    s.store_address,
    s.latitude,
    s.longitude,
    s.google_maps_url,
    s.location_source,
    s.store_type,
    s.has_chiller,
    s.branding_status,
    s.not_brandable_reason,
    s.workflow_status,
    s.submitted_at,
    s.reopen_reason,
    s.reopened_at
  from public.submissions s
  where s.deleted_at is null
    and (
      public.current_app_role() <> 'pic'
      or s.pic_user_id = auth.uid()
    )
    and (
      p_branch_code is null
      or p_branch_code = ''
      or s.branch_code_snapshot = p_branch_code
    )
    and (
      p_branding_status is null
      or p_branding_status = ''
      or s.branding_status::text = p_branding_status
    )
    and (
      p_search is null
      or p_search = ''
      or concat_ws(
        ' ',
        s.store_code,
        s.store_name,
        s.owner_name,
        s.owner_phone,
        s.salesman_code,
        s.pic_name_snapshot,
        s.stockpoint_name_snapshot
      ) ilike '%' || p_search || '%'
    )
  order by s.created_at desc
  limit greatest(1, least(p_limit, 500))
  offset greatest(p_offset, 0);
$$;

revoke all on function public.report_submissions(
  text,
  text,
  text,
  integer,
  integer
) from public;

grant execute on function public.report_submissions(
  text,
  text,
  text,
  integer,
  integer
) to authenticated;

commit;
