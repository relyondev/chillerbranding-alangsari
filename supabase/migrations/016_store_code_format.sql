begin;

-- New Kode Toko format:
-- 4 numeric / 3 numeric / 3–4 numeric
-- Example: 1234/123/123 or 1234/123/1234

-- Safety: do not silently rewrite historical data.
do $$
begin
  if exists (
    select 1
    from public.submissions
    where deleted_at is null
      and store_code !~ '^\d{4}/\d{3}/\d{3,4}$'
  ) then
    raise exception 'existing_store_codes_need_reconciliation_before_016';
  end if;
end
$$;

alter table public.submissions
  drop constraint if exists store_code_format;

alter table public.submissions
  add constraint store_code_format
  check (store_code ~ '^\d{4}/\d{3}/\d{3,4}$');

create or replace function public.create_submission_draft(
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
    p_latitude,
    p_longitude,
    p_location_accuracy_meters,
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
  numeric,numeric,numeric,
  public.store_type,boolean,public.branding_status,text
) from public;

grant execute on function public.create_submission_draft(
  uuid,text,text,text,text,text,text,text,text,text,
  numeric,numeric,numeric,
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
  v_code text :=
    p_salesman_part_1 || '/' ||
    p_salesman_part_2 || '/' ||
    upper(p_salesman_part_3);
begin
  if v_role not in ('super_admin','admin') then
    raise exception 'forbidden';
  end if;

  select *
  into v
  from public.submissions
  where id = p_submission_id
    and deleted_at is null
  for update;

  if v.id is null then
    raise exception 'submission_not_found';
  end if;

  if v.workflow_status <> 'draft' or v.reopen_count < 1 then
    raise exception 'reopened_draft_required';
  end if;

  if v.version <> p_expected_version then
    raise exception 'stale_submission_version';
  end if;

  if p_salesman_part_1 !~ '^\d{4}$'
    or p_salesman_part_2 !~ '^\d{3}$'
    or upper(p_salesman_part_3) !~ '^[A-Z][A-Z0-9]{2,3}$'
  then
    raise exception 'invalid_salesman_code';
  end if;

  if p_store_code !~ '^\d{4}/\d{3}/\d{3,4}$' then
    raise exception 'invalid_store_code';
  end if;

  perform public.assert_no_duplicate_submission(
    p_store_name,
    p_owner_name,
    p_owner_phone,
    v.stockpoint_id,
    v.id
  );

  update public.submissions
  set
    salesman_code_part_1 = p_salesman_part_1,
    salesman_code_part_2 = p_salesman_part_2,
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
    location_captured_at = now(),
    store_type = p_store_type,
    has_chiller = p_has_chiller,
    branding_status = p_branding_status,
    not_brandable_reason =
      case
        when p_branding_status='not_brandable'
          then trim(p_not_brandable_reason)
        else null
      end,
    updated_at = now(),
    version = version + 1
  where id = v.id
  returning * into v;

  insert into public.audit_events(
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    after_data
  )
  values (
    auth.uid(),
    'reopened_submission_edited',
    'submission',
    v.id,
    jsonb_build_object('version',v.version)
  );

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
