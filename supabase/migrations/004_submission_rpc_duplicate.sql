begin;

create or replace function public.normalize_business_text(p_value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(upper(regexp_replace(coalesce(p_value,''), '[^[:alnum:] ]+', ' ', 'g')), '\s+', ' ', 'g'))
$$;

create or replace function public.normalize_phone(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_value,''), '\D', '', 'g');
begin
  if left(v,2) = '62' then
    v := '0' || substr(v,3);
  end if;
  return v;
end;
$$;

create or replace function public.assert_no_duplicate_submission(
  p_store_name text,
  p_owner_name text,
  p_owner_phone text,
  p_stockpoint_id uuid,
  p_exclude_submission_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text := public.normalize_business_text(p_store_name);
  v_owner text := public.normalize_business_text(p_owner_name);
  v_phone text := public.normalize_phone(p_owner_phone);
  v_duplicate uuid;
begin
  select s.id
  into v_duplicate
  from public.submissions s
  where s.deleted_at is null
    and (p_exclude_submission_id is null or s.id <> p_exclude_submission_id)
    and (
      (case when s.store_name_normalized = v_store then 1 else 0 end) +
      (case when s.owner_name_normalized = v_owner then 1 else 0 end) +
      (case when s.owner_phone_normalized = v_phone then 1 else 0 end) +
      (case when s.stockpoint_id = p_stockpoint_id then 1 else 0 end)
    ) >= 3
  limit 1;

  if v_duplicate is not null then
    raise exception 'duplicate_submission_detected'
      using errcode = 'P0001',
            detail = v_duplicate::text;
  end if;
end;
$$;

revoke all on function public.assert_no_duplicate_submission(text,text,text,uuid,uuid) from public;
grant execute on function public.assert_no_duplicate_submission(text,text,text,uuid,uuid) to authenticated;

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
  select * into v_profile from public.profiles where id = v_user and is_active = true;
  if v_profile.id is null or v_profile.role <> 'pic' then
    raise exception 'pic_required';
  end if;

  select * into v_pic from public.pic_profiles where user_id = v_user;
  if v_pic.user_id is null then raise exception 'pic_profile_missing'; end if;

  select * into v_stockpoint from public.stockpoints where id = p_stockpoint_id and is_active = true;
  if v_stockpoint.id is null then raise exception 'stockpoint_not_found'; end if;

  if not exists (
    select 1 from public.pic_stockpoint_assignments a
    where a.pic_user_id = v_user and a.stockpoint_id = p_stockpoint_id and a.is_active = true
  ) then
    raise exception 'stockpoint_not_assigned';
  end if;

  select * into v_branch from public.branches where id = v_pic.branch_id;
  if v_stockpoint.branch_id <> v_pic.branch_id then raise exception 'branch_mismatch'; end if;

  if p_salesman_part_1 !~ '^\d{4}$'
    or p_salesman_part_2 !~ '^\d{3}$'
    or upper(p_salesman_part_3) !~ '^[A-Z][A-Z0-9]{2,3}$'
    or p_salesman_code <> p_salesman_part_1 || '/' || p_salesman_part_2 || '/' || upper(p_salesman_part_3)
  then raise exception 'invalid_salesman_code'; end if;

  if p_store_code !~ '^\d{3,4}$' then raise exception 'invalid_store_code'; end if;

  perform public.assert_no_duplicate_submission(
    p_store_name, p_owner_name, p_owner_phone, p_stockpoint_id, null
  );

  insert into public.submissions(
    pic_user_id, pic_code_snapshot, pic_name_snapshot,
    branch_id, branch_code_snapshot, branch_name_snapshot,
    stockpoint_id, stockpoint_code_snapshot, stockpoint_name_snapshot,
    salesman_code_part_1, salesman_code_part_2, salesman_code_part_3, salesman_code,
    store_code, store_name, store_name_normalized,
    owner_name, owner_name_normalized,
    owner_phone, owner_phone_normalized,
    store_address,
    latitude, longitude, location_accuracy_meters,
    store_type, has_chiller, branding_status, not_brandable_reason
  ) values (
    v_user, v_pic.pic_code, v_profile.full_name,
    v_branch.id, v_branch.code, v_branch.name,
    v_stockpoint.id, v_stockpoint.code, v_stockpoint.name,
    p_salesman_part_1, p_salesman_part_2, upper(p_salesman_part_3), p_salesman_code,
    p_store_code, trim(p_store_name), public.normalize_business_text(p_store_name),
    trim(p_owner_name), public.normalize_business_text(p_owner_name),
    p_owner_phone, public.normalize_phone(p_owner_phone),
    trim(p_store_address),
    p_latitude, p_longitude, p_location_accuracy_meters,
    p_store_type, p_has_chiller, p_branding_status,
    case when p_branding_status = 'not_brandable' then trim(p_not_brandable_reason) else null end
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_submission_draft(uuid,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,public.store_type,boolean,public.branding_status,text) from public;
grant execute on function public.create_submission_draft(uuid,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,public.store_type,boolean,public.branding_status,text) to authenticated;

create or replace function public.submit_submission(
  p_submission_id uuid,
  p_expected_version integer
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.submissions;
begin
  select *
  into v
  from public.submissions
  where id = p_submission_id and deleted_at is null
  for update;

  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.pic_user_id <> auth.uid() then raise exception 'submission_not_owned'; end if;
  if v.workflow_status <> 'draft' then raise exception 'submission_not_draft'; end if;
  if v.version <> p_expected_version then raise exception 'stale_submission_version'; end if;

  perform public.assert_no_duplicate_submission(
    v.store_name, v.owner_name, v.owner_phone, v.stockpoint_id, v.id
  );

  -- Phase 7 will add photo requirement validation here.
  update public.submissions
  set workflow_status = 'done',
      submitted_at = now(),
      updated_at = now(),
      version = version + 1
  where id = v.id
  returning * into v;

  return v;
end;
$$;

revoke all on function public.submit_submission(uuid,integer) from public;
grant execute on function public.submit_submission(uuid,integer) to authenticated;

commit;
