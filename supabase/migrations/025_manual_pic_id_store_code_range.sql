begin;

-- Branding Chiller V1.5.0
-- 1) PIC numeric ID is manually selected (01..99) while branch prefix remains automatic.
-- 2) Store code manual suffix expands from 3..4 digits to 2..6 digits.
-- 3) Existing duplicate engine, branding logic, geolocation logic, and workflow are preserved.

alter table public.submissions
  drop constraint if exists store_code_format;

alter table public.submissions
  add constraint store_code_format
  check (store_code ~ '^\d{4}/\d{3}/\d{2,6}$');

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

  if p_store_code !~ ('^' || v_sp_1 || '/' || v_sp_2 || '/\d{2,6}$') then
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

  if p_store_code !~ ('^' || v_sp_1 || '/' || v_sp_2 || '/\d{2,6}$') then
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


-- PIC ID is now selected manually per branch (01..99).
drop function if exists public.admin_finalize_user(uuid,uuid,text,text,text,public.app_role,uuid,uuid[]);

create function public.admin_finalize_user(
  p_actor_user_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role public.app_role,
  p_branch_id uuid default null,
  p_stockpoint_ids uuid[] default '{}'::uuid[],
  p_pic_number integer default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor public.profiles;
  v_branch public.branches;
  v_pic_code text;
  v_sp uuid;
begin
  select * into v_actor from public.profiles where id=p_actor_user_id and is_active=true;
  if v_actor.id is null or v_actor.role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  if p_role='super_admin' and v_actor.role<>'super_admin' then raise exception 'super_admin_required'; end if;

  insert into public.profiles(id,email,full_name,phone,role,is_active)
  values(p_auth_user_id,lower(trim(p_email)),trim(p_full_name),nullif(trim(p_phone),''),p_role,true);

  if p_role='pic' then
    if p_branch_id is null then raise exception 'pic_branch_required'; end if;
    if p_pic_number is null or p_pic_number < 1 or p_pic_number > 99 then raise exception 'pic_number_must_be_01_to_99'; end if;

    select * into v_branch from public.branches where id=p_branch_id and is_active=true;
    if v_branch.id is null then raise exception 'branch_not_found'; end if;

    v_pic_code := v_branch.code || '-' || lpad(p_pic_number::text,2,'0');

    if exists (
      select 1 from public.pic_profiles
      where branch_id=p_branch_id and sequence_number=p_pic_number
    ) then
      raise exception 'pic_code_already_exists';
    end if;

    insert into public.pic_profiles(user_id,branch_id,pic_code,sequence_number)
    values(p_auth_user_id,p_branch_id,v_pic_code,p_pic_number);

    insert into public.branch_pic_sequences(branch_id,last_value)
    values(p_branch_id,p_pic_number)
    on conflict(branch_id) do update
      set last_value=greatest(public.branch_pic_sequences.last_value, excluded.last_value);

    foreach v_sp in array p_stockpoint_ids loop
      if not exists(select 1 from public.stockpoints where id=v_sp and branch_id=p_branch_id and is_active=true)
        then raise exception 'stockpoint_branch_mismatch'; end if;
      insert into public.pic_stockpoint_assignments(pic_user_id,stockpoint_id,assigned_by,is_active)
      values(p_auth_user_id,v_sp,p_actor_user_id,true);
    end loop;
  end if;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(p_actor_user_id,'user_created','profile',p_auth_user_id,jsonb_build_object('role',p_role,'email',lower(trim(p_email)),'pic_code',v_pic_code));

  return jsonb_build_object('user_id',p_auth_user_id,'pic_code',v_pic_code);
end;
$$;

revoke all on function public.admin_finalize_user(uuid,uuid,text,text,text,public.app_role,uuid,uuid[],integer) from public;
grant execute on function public.admin_finalize_user(uuid,uuid,text,text,text,public.app_role,uuid,uuid[],integer) to service_role;

commit;
