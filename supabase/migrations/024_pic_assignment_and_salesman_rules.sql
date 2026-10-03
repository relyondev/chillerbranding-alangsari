begin;

-- Branding Chiller V1.4.0
-- 1) PIC assignment can be changed after user creation.
-- 2) A Stockpoint assignment cannot be removed once the PIC has ever created work there.
-- 3) Salesman code suffix is fixed to S + 1..4 digits.
-- 4) The first two code segments must match the selected Stockpoint code.
-- 5) Chiller = false always means not_brandable.
-- 6) Geolocation is truly optional; manual Maps remains supported.

alter table public.submissions
  drop constraint if exists salesman_part_3_format;

alter table public.submissions
  add constraint salesman_part_3_format
  check (salesman_code_part_3 ~ '^[A-Z][A-Z0-9]{2,3}$' or salesman_code_part_3 ~ '^S\d{1,4}$');

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
    or
    (
      location_source = 'not_provided'
      and latitude is null
      and longitude is null
      and location_accuracy_meters is null
      and google_maps_url is null
    )
  );

-- Replace create_submission_draft while preserving the current 021 signature.
drop function if exists public.create_submission_draft(
  uuid,text,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,text,
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
  v_sp_1 text;
  v_sp_2 text;
  v_effective_branding public.branding_status;
  v_effective_reason text;
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

  v_sp_1 := split_part(v_stockpoint.code, '/', 1);
  v_sp_2 := split_part(v_stockpoint.code, '/', 2);

  if v_sp_1 !~ '^\d{4}$' or v_sp_2 !~ '^\d{3}$' then
    raise exception 'invalid_stockpoint_code';
  end if;

  if p_salesman_part_1 <> v_sp_1
    or p_salesman_part_2 <> v_sp_2
    or upper(p_salesman_part_3) !~ '^S\d{1,4}$'
    or p_salesman_code <> v_sp_1 || '/' || v_sp_2 || '/' || upper(p_salesman_part_3)
  then
    raise exception 'invalid_salesman_code';
  end if;

  if p_store_code !~ ('^' || v_sp_1 || '/' || v_sp_2 || '/\d{3,4}$') then
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
    v_location_source := 'not_provided';
  end if;

  if p_has_chiller = false then
    v_effective_branding := 'not_brandable';
    v_effective_reason := 'Tidak ada chiller';
  else
    v_effective_branding := p_branding_status;
    v_effective_reason := case
      when p_branding_status = 'not_brandable' then nullif(trim(p_not_brandable_reason), '')
      else null
    end;
  end if;

  if v_effective_branding = 'not_brandable' and v_effective_reason is null then
    raise exception 'not_brandable_reason_required';
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
    v_sp_1,
    v_sp_2,
    upper(p_salesman_part_3),
    v_sp_1 || '/' || v_sp_2 || '/' || upper(p_salesman_part_3),
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
    v_effective_branding,
    v_effective_reason
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

-- Existing PIC assignment management.
create or replace function public.admin_get_pic_stockpoint_options(
  p_pic_user_id uuid
)
returns table(
  stockpoint_id uuid,
  stockpoint_code text,
  stockpoint_name text,
  is_assigned boolean,
  has_work boolean,
  assigned_to_other_pic boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select role
    from public.profiles
    where id = auth.uid() and is_active = true
  ), pic as (
    select pp.user_id, pp.branch_id
    from public.pic_profiles pp
    where pp.user_id = p_pic_user_id
  )
  select
    sp.id,
    sp.code,
    sp.name,
    exists (
      select 1
      from public.pic_stockpoint_assignments a
      where a.stockpoint_id = sp.id
        and a.pic_user_id = p_pic_user_id
        and a.is_active = true
    ) as is_assigned,
    exists (
      select 1
      from public.submissions s
      where s.stockpoint_id = sp.id
        and s.pic_user_id = p_pic_user_id
    ) as has_work,
    exists (
      select 1
      from public.pic_stockpoint_assignments a
      where a.stockpoint_id = sp.id
        and a.pic_user_id <> p_pic_user_id
        and a.is_active = true
    ) as assigned_to_other_pic
  from pic
  join public.stockpoints sp on sp.branch_id = pic.branch_id and sp.is_active = true
  where exists (select 1 from actor where role in ('super_admin','admin'))
  order by sp.name;
$$;

revoke all on function public.admin_get_pic_stockpoint_options(uuid) from public;
grant execute on function public.admin_get_pic_stockpoint_options(uuid) to authenticated;

create or replace function public.admin_set_pic_stockpoint_assignments(
  p_pic_user_id uuid,
  p_stockpoint_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_pic public.pic_profiles;
  v_requested uuid[] := coalesce(p_stockpoint_ids, '{}'::uuid[]);
  v_sp uuid;
  v_current uuid[];
  v_removed uuid[];
  v_added uuid[];
begin
  select * into v_actor
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_actor.id is null or v_actor.role not in ('super_admin','admin') then
    raise exception 'forbidden';
  end if;

  select * into v_pic
  from public.pic_profiles
  where user_id = p_pic_user_id;

  if v_pic.user_id is null then
    raise exception 'pic_not_found';
  end if;

  if exists (
    select 1
    from unnest(v_requested) req(id)
    left join public.stockpoints sp on sp.id = req.id
    where sp.id is null
       or sp.is_active = false
       or sp.branch_id <> v_pic.branch_id
  ) then
    raise exception 'stockpoint_branch_mismatch';
  end if;

  if exists (
    select 1
    from public.pic_stockpoint_assignments a
    where a.stockpoint_id = any(v_requested)
      and a.pic_user_id <> p_pic_user_id
      and a.is_active = true
  ) then
    raise exception 'stockpoint_already_assigned';
  end if;

  select coalesce(array_agg(a.stockpoint_id), '{}'::uuid[])
  into v_current
  from public.pic_stockpoint_assignments a
  where a.pic_user_id = p_pic_user_id
    and a.is_active = true;

  select coalesce(array_agg(x), '{}'::uuid[])
  into v_removed
  from unnest(v_current) x
  where not (x = any(v_requested));

  if exists (
    select 1
    from public.submissions s
    where s.pic_user_id = p_pic_user_id
      and s.stockpoint_id = any(v_removed)
  ) then
    raise exception 'cannot_unassign_stockpoint_with_work';
  end if;

  select coalesce(array_agg(x), '{}'::uuid[])
  into v_added
  from unnest(v_requested) x
  where not (x = any(v_current));

  if cardinality(v_removed) > 0 then
    update public.pic_stockpoint_assignments
    set is_active = false
    where pic_user_id = p_pic_user_id
      and stockpoint_id = any(v_removed)
      and is_active = true;
  end if;

  if cardinality(v_added) > 0 then
    foreach v_sp in array v_added loop
      insert into public.pic_stockpoint_assignments(
        pic_user_id, stockpoint_id, assigned_by, is_active
      ) values (
        p_pic_user_id, v_sp, auth.uid(), true
      );
    end loop;
  end if;

  insert into public.audit_events(
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    after_data
  ) values (
    auth.uid(),
    'pic_stockpoint_assignments_updated',
    'profile',
    p_pic_user_id,
    jsonb_build_object(
      'active_stockpoint_ids', v_requested,
      'added', v_added,
      'removed', v_removed
    )
  );

  return jsonb_build_object(
    'pic_user_id', p_pic_user_id,
    'active_stockpoint_ids', v_requested,
    'added', v_added,
    'removed', v_removed
  );
end;
$$;

revoke all on function public.admin_set_pic_stockpoint_assignments(uuid,uuid[]) from public;
grant execute on function public.admin_set_pic_stockpoint_assignments(uuid,uuid[]) to authenticated;

create or replace function public.admin_update_reopened_submission(
  p_submission_id uuid,
  p_expected_version integer,
  p_salesman_part_1 text,
  p_salesman_part_2 text,
  p_salesman_part_3 text,
  p_store_code text,
  p_store_name text,
  p_owner_name text,
  p_owner_phone text,
  p_store_address text,
  p_latitude numeric,
  p_longitude numeric,
  p_location_accuracy_meters numeric,
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
  v_role public.app_role := public.current_app_role();
  v public.submissions;
  v_sp_1 text;
  v_sp_2 text;
  v_code text;
  v_effective_branding public.branding_status;
  v_effective_reason text;
begin
  if v_role not in ('super_admin','admin') then
    raise exception 'forbidden';
  end if;

  select * into v
  from public.submissions
  where id = p_submission_id and deleted_at is null
  for update;

  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.workflow_status <> 'draft' or v.reopen_count < 1 then raise exception 'reopened_draft_required'; end if;
  if v.version <> p_expected_version then raise exception 'stale_submission_version'; end if;

  v_sp_1 := split_part(v.stockpoint_code_snapshot, '/', 1);
  v_sp_2 := split_part(v.stockpoint_code_snapshot, '/', 2);
  v_code := v_sp_1 || '/' || v_sp_2 || '/' || upper(p_salesman_part_3);

  if p_salesman_part_1 <> v_sp_1
    or p_salesman_part_2 <> v_sp_2
    or upper(p_salesman_part_3) !~ '^S\d{1,4}$'
  then
    raise exception 'invalid_salesman_code';
  end if;

  if p_store_code !~ ('^' || v_sp_1 || '/' || v_sp_2 || '/\d{3,4}$') then
    raise exception 'invalid_store_code';
  end if;

  if p_has_chiller = false then
    v_effective_branding := 'not_brandable';
    v_effective_reason := 'Tidak ada chiller';
  else
    v_effective_branding := p_branding_status;
    v_effective_reason := case when p_branding_status='not_brandable' then nullif(trim(p_not_brandable_reason),'') else null end;
  end if;

  if v_effective_branding='not_brandable' and v_effective_reason is null then
    raise exception 'not_brandable_reason_required';
  end if;

  perform public.assert_no_duplicate_submission(
    p_store_name, p_owner_name, p_owner_phone, v.stockpoint_id, v.id
  );

  update public.submissions
  set
    salesman_code_part_1 = v_sp_1,
    salesman_code_part_2 = v_sp_2,
    salesman_code_part_3 = upper(p_salesman_part_3),
    salesman_code = v_code,
    store_code = p_store_code,
    store_name = trim(p_store_name),
    store_name_normalized = public.normalize_business_text(p_store_name),
    owner_name = trim(p_owner_name),
    owner_name_normalized = public.normalize_business_text(p_owner_name),
    owner_phone = p_owner_phone,
    owner_phone_normalized = public.normalize_phone(p_owner_phone),
    store_address = trim(p_store_address),
    latitude = p_latitude,
    longitude = p_longitude,
    location_accuracy_meters = p_location_accuracy_meters,
    location_captured_at = case when p_latitude is not null then now() else null end,
    store_type = p_store_type,
    has_chiller = p_has_chiller,
    branding_status = v_effective_branding,
    not_brandable_reason = v_effective_reason,
    updated_at = now(),
    version = version + 1
  where id = v.id
  returning * into v;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(auth.uid(),'reopened_submission_edited','submission',v.id,jsonb_build_object('version',v.version));

  return v;
end;
$$;

revoke all on function public.admin_update_reopened_submission(
  uuid,integer,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,
  public.store_type,boolean,public.branding_status,text
) from public;

grant execute on function public.admin_update_reopened_submission(
  uuid,integer,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,
  public.store_type,boolean,public.branding_status,text
) to authenticated;

commit;
