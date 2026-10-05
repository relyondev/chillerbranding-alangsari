begin;

-- Branding Chiller V1.6.0
-- Additive master Salesman + direct Admin edit for DONE submissions + richer dashboard/report fields.
-- No existing submission rows are deleted or rewritten.

create table if not exists public.salesmen (
  id uuid primary key default gen_random_uuid(),
  stockpoint_id uuid not null references public.stockpoints(id),
  suffix text not null,
  full_code text not null,
  name text not null,
  name_normalized text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salesmen_suffix_format check (suffix ~ '^S\d{1,5}$')
);

create unique index if not exists salesmen_active_stockpoint_suffix_uq
  on public.salesmen(stockpoint_id, suffix)
  where is_active=true;
create index if not exists salesmen_stockpoint_idx on public.salesmen(stockpoint_id) where is_active=true;
create index if not exists salesmen_name_idx on public.salesmen(name_normalized) where is_active=true;

alter table public.salesmen enable row level security;

drop policy if exists salesmen_read on public.salesmen;
create policy salesmen_read on public.salesmen
for select to authenticated using (
  public.current_app_role() in ('super_admin','admin')
  or (
    public.current_app_role()='pic'
    and exists (
      select 1 from public.pic_stockpoint_assignments a
      where a.pic_user_id=auth.uid()
        and a.stockpoint_id=salesmen.stockpoint_id
        and a.is_active=true
    )
  )
);

alter table public.submissions add column if not exists salesman_id uuid references public.salesmen(id);
alter table public.submissions add column if not exists salesman_name_snapshot text;
alter table public.submissions add column if not exists last_admin_edited_at timestamptz;
alter table public.submissions add column if not exists last_admin_edited_by uuid references public.profiles(id);
alter table public.submissions add column if not exists last_admin_editor_name text;
create index if not exists submissions_salesman_id_idx on public.submissions(salesman_id) where deleted_at is null;

alter table public.submissions drop constraint if exists salesman_part_3_format;
alter table public.submissions add constraint salesman_part_3_format
  check (salesman_code_part_3 ~ '^[A-Z][A-Z0-9]{2,3}$' or salesman_code_part_3 ~ '^S\d{1,5}$');

create or replace function public.pic_create_salesman(
  p_stockpoint_id uuid,
  p_suffix text,
  p_name text
)
returns public.salesmen
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_stockpoint public.stockpoints;
  v_suffix text := upper(trim(p_suffix));
  v_name text := upper(trim(p_name));
  v_sp1 text;
  v_sp2 text;
  v_result public.salesmen;
begin
  select * into v_profile from public.profiles where id=v_user and is_active=true;
  if v_profile.id is null or v_profile.role<>'pic' then raise exception 'pic_required'; end if;
  if not exists(select 1 from public.pic_stockpoint_assignments a where a.pic_user_id=v_user and a.stockpoint_id=p_stockpoint_id and a.is_active=true) then
    raise exception 'stockpoint_not_assigned';
  end if;
  if v_suffix !~ '^S\d{1,5}$' then raise exception 'invalid_salesman_suffix'; end if;
  if length(v_name)<2 then raise exception 'salesman_name_required'; end if;

  select * into v_stockpoint from public.stockpoints where id=p_stockpoint_id and is_active=true;
  if v_stockpoint.id is null then raise exception 'stockpoint_not_found'; end if;
  v_sp1:=split_part(v_stockpoint.code,'/',1);
  v_sp2:=split_part(v_stockpoint.code,'/',2);

  if exists(select 1 from public.salesmen where stockpoint_id=p_stockpoint_id and suffix=v_suffix and is_active=true) then
    raise exception 'salesman_code_already_exists';
  end if;

  insert into public.salesmen(stockpoint_id,suffix,full_code,name,name_normalized,created_by,updated_by)
  values(p_stockpoint_id,v_suffix,v_sp1||'/'||v_sp2||'/'||v_suffix,v_name,public.normalize_business_text(v_name),v_user,v_user)
  returning * into v_result;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(v_user,'salesman_created_by_pic','salesman',v_result.id,jsonb_build_object('full_code',v_result.full_code,'name',v_result.name,'stockpoint_id',p_stockpoint_id));
  return v_result;
end;
$$;

revoke all on function public.pic_create_salesman(uuid,text,text) from public;
grant execute on function public.pic_create_salesman(uuid,text,text) to authenticated;

create or replace function public.admin_save_salesman(
  p_salesman_id uuid,
  p_stockpoint_id uuid,
  p_suffix text,
  p_name text
)
returns public.salesmen
language plpgsql
security definer
set search_path=public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_stockpoint public.stockpoints;
  v_suffix text := upper(trim(p_suffix));
  v_name text := upper(trim(p_name));
  v_sp1 text;
  v_sp2 text;
  v_result public.salesmen;
  v_before jsonb;
begin
  if v_role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  if v_suffix !~ '^S\d{1,5}$' then raise exception 'invalid_salesman_suffix'; end if;
  if length(v_name)<2 then raise exception 'salesman_name_required'; end if;

  select * into v_stockpoint from public.stockpoints where id=p_stockpoint_id and is_active=true;
  if v_stockpoint.id is null then raise exception 'stockpoint_not_found'; end if;
  v_sp1:=split_part(v_stockpoint.code,'/',1);
  v_sp2:=split_part(v_stockpoint.code,'/',2);

  if p_salesman_id is null then
    if exists(select 1 from public.salesmen where stockpoint_id=p_stockpoint_id and suffix=v_suffix and is_active=true) then
      raise exception 'salesman_code_already_exists';
    end if;
    insert into public.salesmen(stockpoint_id,suffix,full_code,name,name_normalized,created_by,updated_by)
    values(p_stockpoint_id,v_suffix,v_sp1||'/'||v_sp2||'/'||v_suffix,v_name,public.normalize_business_text(v_name),auth.uid(),auth.uid())
    returning * into v_result;
    insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
    values(auth.uid(),'salesman_created','salesman',v_result.id,to_jsonb(v_result));
  else
    select to_jsonb(s) into v_before from public.salesmen s where s.id=p_salesman_id and s.is_active=true;
    if v_before is null then raise exception 'salesman_not_found'; end if;
    if (v_before->>'stockpoint_id')::uuid<>p_stockpoint_id then raise exception 'salesman_stockpoint_locked'; end if;
    if exists(select 1 from public.salesmen where stockpoint_id=p_stockpoint_id and suffix=v_suffix and is_active=true and id<>p_salesman_id) then
      raise exception 'salesman_code_already_exists';
    end if;
    update public.salesmen set
      stockpoint_id=p_stockpoint_id,
      suffix=v_suffix,
      full_code=v_sp1||'/'||v_sp2||'/'||v_suffix,
      name=v_name,
      name_normalized=public.normalize_business_text(v_name),
      updated_by=auth.uid(),updated_at=now()
    where id=p_salesman_id
    returning * into v_result;
    insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,before_data,after_data)
    values(auth.uid(),'salesman_updated','salesman',v_result.id,v_before,to_jsonb(v_result));
  end if;
  return v_result;
end;
$$;

revoke all on function public.admin_save_salesman(uuid,uuid,text,text) from public;
grant execute on function public.admin_save_salesman(uuid,uuid,text,text) to authenticated;

create or replace function public.admin_delete_salesman(p_salesman_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_role public.app_role:=public.current_app_role(); v public.salesmen;
begin
  if v_role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  select * into v from public.salesmen where id=p_salesman_id and is_active=true for update;
  if v.id is null then raise exception 'salesman_not_found'; end if;
  if exists(select 1 from public.submissions s where s.salesman_id=v.id and s.deleted_at is null) then
    raise exception 'salesman_has_work';
  end if;
  update public.salesmen set is_active=false,updated_by=auth.uid(),updated_at=now() where id=v.id;
  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'salesman_deleted','salesman',v.id,to_jsonb(v),jsonb_build_object('is_active',false));
  return true;
end;
$$;
revoke all on function public.admin_delete_salesman(uuid) from public;
grant execute on function public.admin_delete_salesman(uuid) to authenticated;

-- Submission creation keeps the existing RPC signature, but now resolves a Salesman master record.
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
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_profile public.profiles;
  v_pic public.pic_profiles;
  v_branch public.branches;
  v_stockpoint public.stockpoints;
  v_salesman public.salesmen;
  v_result public.submissions;
  v_manual_url text:=nullif(trim(p_google_maps_url),'');
  v_location_source text;
  v_sp_1 text;
  v_sp_2 text;
  v_effective_branding public.branding_status;
  v_effective_reason text;
begin
  select * into v_profile from public.profiles where id=v_user and is_active=true;
  if v_profile.id is null or v_profile.role<>'pic' then raise exception 'pic_required'; end if;
  select * into v_pic from public.pic_profiles where user_id=v_user;
  if v_pic.user_id is null then raise exception 'pic_profile_missing'; end if;
  select * into v_stockpoint from public.stockpoints where id=p_stockpoint_id and is_active=true;
  if v_stockpoint.id is null then raise exception 'stockpoint_not_found'; end if;
  if not exists(select 1 from public.pic_stockpoint_assignments a where a.pic_user_id=v_user and a.stockpoint_id=p_stockpoint_id and a.is_active=true) then
    raise exception 'stockpoint_not_assigned';
  end if;
  select * into v_branch from public.branches where id=v_pic.branch_id;
  if v_stockpoint.branch_id<>v_pic.branch_id then raise exception 'branch_mismatch'; end if;

  v_sp_1:=split_part(v_stockpoint.code,'/',1);
  v_sp_2:=split_part(v_stockpoint.code,'/',2);
  if v_sp_1 !~ '^\d{4}$' or v_sp_2 !~ '^\d{3}$' then raise exception 'invalid_stockpoint_code'; end if;
  if p_salesman_part_1<>v_sp_1 or p_salesman_part_2<>v_sp_2 or upper(p_salesman_part_3) !~ '^S\d{1,5}$'
     or p_salesman_code<>v_sp_1||'/'||v_sp_2||'/'||upper(p_salesman_part_3) then
    raise exception 'invalid_salesman_code';
  end if;

  select * into v_salesman from public.salesmen
  where stockpoint_id=p_stockpoint_id and suffix=upper(p_salesman_part_3) and is_active=true;
  if v_salesman.id is null then raise exception 'salesman_not_registered'; end if;

  if p_store_code !~ ('^'||v_sp_1||'/'||v_sp_2||'/\d{2,6}$') then raise exception 'invalid_store_code'; end if;

  if p_latitude is not null or p_longitude is not null or p_location_accuracy_meters is not null then
    if p_latitude is null or p_longitude is null or p_location_accuracy_meters is null then raise exception 'incomplete_browser_geolocation'; end if;
    if v_manual_url is not null then raise exception 'choose_single_location_source'; end if;
    v_location_source:='browser_geolocation';
  elsif v_manual_url is not null then v_location_source:='manual_google_maps';
  else v_location_source:='not_provided'; end if;

  if p_has_chiller=false then
    v_effective_branding:='not_brandable'; v_effective_reason:='Tidak ada chiller';
  else
    v_effective_branding:=p_branding_status;
    v_effective_reason:=case when p_branding_status='not_brandable' then nullif(trim(p_not_brandable_reason),'') else null end;
  end if;
  if v_effective_branding='not_brandable' and v_effective_reason is null then raise exception 'not_brandable_reason_required'; end if;

  perform public.assert_no_duplicate_submission(p_store_name,p_owner_name,p_owner_phone,p_stockpoint_id,null);

  insert into public.submissions(
    pic_user_id,pic_code_snapshot,pic_name_snapshot,
    branch_id,branch_code_snapshot,branch_name_snapshot,
    stockpoint_id,stockpoint_code_snapshot,stockpoint_name_snapshot,
    salesman_id,salesman_name_snapshot,salesman_code_part_1,salesman_code_part_2,salesman_code_part_3,salesman_code,
    store_code,store_name,store_name_normalized,owner_name,owner_name_normalized,owner_phone,owner_phone_normalized,store_address,
    latitude,longitude,location_accuracy_meters,location_captured_at,location_source,google_maps_url,
    store_type,has_chiller,branding_status,not_brandable_reason
  ) values (
    v_user,v_pic.pic_code,v_profile.full_name,
    v_branch.id,v_branch.code,v_branch.name,
    v_stockpoint.id,v_stockpoint.code,v_stockpoint.name,
    v_salesman.id,v_salesman.name,v_sp_1,v_sp_2,upper(p_salesman_part_3),v_sp_1||'/'||v_sp_2||'/'||upper(p_salesman_part_3),
    p_store_code,trim(p_store_name),public.normalize_business_text(p_store_name),trim(p_owner_name),public.normalize_business_text(p_owner_name),p_owner_phone,public.normalize_phone(p_owner_phone),trim(p_store_address),
    case when v_location_source='browser_geolocation' then p_latitude else null end,
    case when v_location_source='browser_geolocation' then p_longitude else null end,
    case when v_location_source='browser_geolocation' then p_location_accuracy_meters else null end,
    case when v_location_source='browser_geolocation' then now() else null end,
    v_location_source,case when v_location_source='manual_google_maps' then v_manual_url else null end,
    p_store_type,p_has_chiller,v_effective_branding,v_effective_reason
  ) returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.create_submission_draft(uuid,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,public.store_type,boolean,public.branding_status,text) from public;
grant execute on function public.create_submission_draft(uuid,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,public.store_type,boolean,public.branding_status,text) to authenticated;

create or replace function public.admin_update_done_submission(
  p_submission_id uuid,
  p_expected_version integer,
  p_salesman_part_3 text,
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
set search_path=public
as $$
declare
  v_role public.app_role:=public.current_app_role();
  v public.submissions;
  v_before jsonb;
  v_actor public.profiles;
  v_salesman public.salesmen;
  v_sp1 text; v_sp2 text; v_suffix text:=upper(trim(p_salesman_part_3));
  v_manual_url text:=nullif(trim(p_google_maps_url),'');
  v_location_source text;
  v_effective_branding public.branding_status;
  v_effective_reason text;
begin
  if v_role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  select * into v_actor from public.profiles where id=auth.uid() and is_active=true;
  select * into v from public.submissions where id=p_submission_id and deleted_at is null for update;
  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.workflow_status<>'done' then raise exception 'done_submission_required'; end if;
  if v.version<>p_expected_version then raise exception 'stale_submission_version'; end if;
  v_before:=to_jsonb(v);

  v_sp1:=split_part(v.stockpoint_code_snapshot,'/',1); v_sp2:=split_part(v.stockpoint_code_snapshot,'/',2);
  if v_suffix !~ '^S\d{1,5}$' then raise exception 'invalid_salesman_code'; end if;
  select * into v_salesman from public.salesmen where stockpoint_id=v.stockpoint_id and suffix=v_suffix and is_active=true;
  if v_salesman.id is null and v_suffix<>v.salesman_code_part_3 then raise exception 'salesman_not_registered'; end if;
  if p_store_code !~ ('^'||v_sp1||'/'||v_sp2||'/\d{2,6}$') then raise exception 'invalid_store_code'; end if;

  if p_latitude is not null or p_longitude is not null or p_location_accuracy_meters is not null then
    if p_latitude is null or p_longitude is null or p_location_accuracy_meters is null then raise exception 'incomplete_browser_geolocation'; end if;
    if v_manual_url is not null then raise exception 'choose_single_location_source'; end if;
    v_location_source:='browser_geolocation';
  elsif v_manual_url is not null then v_location_source:='manual_google_maps';
  else v_location_source:='not_provided'; end if;

  if p_has_chiller=false then
    v_effective_branding:='not_brandable'; v_effective_reason:='Tidak ada chiller';
  else
    v_effective_branding:=p_branding_status;
    v_effective_reason:=case when p_branding_status='not_brandable' then nullif(trim(p_not_brandable_reason),'') else null end;
  end if;
  if v_effective_branding='not_brandable' and v_effective_reason is null then raise exception 'not_brandable_reason_required'; end if;

  perform public.assert_no_duplicate_submission(p_store_name,p_owner_name,p_owner_phone,v.stockpoint_id,v.id);

  update public.submissions set
    salesman_id=coalesce(v_salesman.id,v.salesman_id),salesman_name_snapshot=coalesce(v_salesman.name,v.salesman_name_snapshot),
    salesman_code_part_1=v_sp1,salesman_code_part_2=v_sp2,salesman_code_part_3=v_suffix,
    salesman_code=v_sp1||'/'||v_sp2||'/'||v_suffix,
    store_code=p_store_code,
    store_name=trim(p_store_name),store_name_normalized=public.normalize_business_text(p_store_name),
    owner_name=trim(p_owner_name),owner_name_normalized=public.normalize_business_text(p_owner_name),
    owner_phone=p_owner_phone,owner_phone_normalized=public.normalize_phone(p_owner_phone),
    store_address=trim(p_store_address),
    latitude=case when v_location_source='browser_geolocation' then p_latitude else null end,
    longitude=case when v_location_source='browser_geolocation' then p_longitude else null end,
    location_accuracy_meters=case when v_location_source='browser_geolocation' then p_location_accuracy_meters else null end,
    location_captured_at=case when v_location_source='browser_geolocation' then now() else null end,
    location_source=v_location_source,
    google_maps_url=case when v_location_source='manual_google_maps' then v_manual_url else null end,
    store_type=p_store_type,has_chiller=p_has_chiller,branding_status=v_effective_branding,not_brandable_reason=v_effective_reason,
    last_admin_edited_at=now(),last_admin_edited_by=auth.uid(),last_admin_editor_name=v_actor.full_name,
    updated_at=now(),version=version+1
  where id=v.id returning * into v;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,before_data,after_data)
  values(auth.uid(),'done_submission_admin_edited','submission',v.id,v_before,to_jsonb(v));
  return v;
end;
$$;

revoke all on function public.admin_update_done_submission(uuid,integer,text,text,text,text,text,text,numeric,numeric,numeric,text,public.store_type,boolean,public.branding_status,text) from public;
grant execute on function public.admin_update_done_submission(uuid,integer,text,text,text,text,text,text,numeric,numeric,numeric,text,public.store_type,boolean,public.branding_status,text) to authenticated;

-- Photo replacement is allowed on DONE only when the uploader is an active Admin/Super Admin.
create or replace function public.register_uploaded_photo(
  p_submission_id uuid,
  p_photo_type public.photo_type,
  p_drive_file_id text,
  p_drive_folder_id text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_uploaded_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_old public.submission_photos; v_new uuid; v_version integer; v_submission public.submissions; v_actor public.profiles;
begin
  select * into v_submission from public.submissions where id=p_submission_id and deleted_at is null for update;
  if v_submission.id is null then raise exception 'submission_not_found'; end if;
  select * into v_actor from public.profiles where id=p_uploaded_by and is_active=true;
  if v_submission.workflow_status='draft' then
    if p_uploaded_by<>v_submission.pic_user_id and coalesce(v_actor.role::text,'') not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  elsif v_submission.workflow_status='done' then
    if coalesce(v_actor.role::text,'') not in ('admin','super_admin') then raise exception 'submission_not_editable'; end if;
  else raise exception 'submission_not_editable'; end if;

  select * into v_old from public.submission_photos
  where submission_id=p_submission_id and photo_type=p_photo_type and is_active=true for update;
  if v_old.id is not null then update public.submission_photos set is_active=false,replaced_at=now() where id=v_old.id; end if;

  insert into public.submission_photos(submission_id,photo_type,drive_file_id,drive_folder_id,file_name,mime_type,file_size,uploaded_by)
  values(p_submission_id,p_photo_type,p_drive_file_id,p_drive_folder_id,p_file_name,p_mime_type,p_file_size,p_uploaded_by)
  returning id into v_new;

  update public.submissions set
    drive_store_folder_id=coalesce(drive_store_folder_id,p_drive_folder_id),
    updated_at=now(),version=version+1,
    last_admin_edited_at=case when v_submission.workflow_status='done' then now() else last_admin_edited_at end,
    last_admin_edited_by=case when v_submission.workflow_status='done' then p_uploaded_by else last_admin_edited_by end,
    last_admin_editor_name=case when v_submission.workflow_status='done' then v_actor.full_name else last_admin_editor_name end
  where id=p_submission_id returning version into v_version;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(p_uploaded_by,
    case when v_submission.workflow_status='done' then 'done_submission_photo_replaced' when v_old.id is null then 'photo_uploaded' else 'photo_replaced' end,
    'submission',p_submission_id,jsonb_build_object('photo_type',p_photo_type,'photo_id',v_new));

  if v_old.id is not null then
    insert into public.integration_jobs(job_type,entity_id,idempotency_key)
    values('drive_cleanup',v_old.id,'drive_cleanup:'||v_old.id::text) on conflict(idempotency_key) do nothing;
  end if;
  return jsonb_build_object('photo_id',v_new,'old_drive_file_id',v_old.drive_file_id,'version',v_version);
end;
$$;

revoke all on function public.register_uploaded_photo(uuid,public.photo_type,text,text,text,text,bigint,uuid) from public;
grant execute on function public.register_uploaded_photo(uuid,public.photo_type,text,text,text,text,bigint,uuid) to service_role;

-- Report RPC gains salesman name, map URL, version and Admin-edit metadata.
drop function if exists public.report_submissions(text,text,text,integer,integer);
create function public.report_submissions(
  p_search text default null,
  p_branch_code text default null,
  p_branding_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table(
  id uuid,created_at timestamptz,installation_date date,branch_name text,branch_code text,stockpoint_id uuid,stockpoint_name text,stockpoint_code text,
  pic_code text,pic_name text,salesman_id uuid,salesman_code text,salesman_name text,store_code text,store_name text,owner_name text,owner_phone text,
  store_address text,latitude numeric,longitude numeric,location_accuracy_meters numeric,google_maps_url text,store_type public.store_type,has_chiller boolean,
  branding_status public.branding_status,not_brandable_reason text,workflow_status public.workflow_status,submitted_at timestamptz,reopen_reason text,reopened_at timestamptz,
  version integer,last_admin_edited_at timestamptz,last_admin_editor_name text
)
language sql stable security definer set search_path=public
as $$
  select s.id,s.created_at,s.installation_date,s.branch_name_snapshot,s.branch_code_snapshot,s.stockpoint_id,s.stockpoint_name_snapshot,s.stockpoint_code_snapshot,
    s.pic_code_snapshot,s.pic_name_snapshot,s.salesman_id,s.salesman_code,coalesce(s.salesman_name_snapshot,sm.name),s.store_code,s.store_name,s.owner_name,s.owner_phone,
    s.store_address,s.latitude,s.longitude,s.location_accuracy_meters,s.google_maps_url,s.store_type,s.has_chiller,s.branding_status,s.not_brandable_reason,
    s.workflow_status,s.submitted_at,s.reopen_reason,s.reopened_at,s.version,s.last_admin_edited_at,s.last_admin_editor_name
  from public.submissions s
  left join public.salesmen sm on sm.id=s.salesman_id
  where s.deleted_at is null
    and (public.current_app_role()<>'pic' or s.pic_user_id=auth.uid())
    and (p_branch_code is null or p_branch_code='' or s.branch_code_snapshot=p_branch_code)
    and (p_branding_status is null or p_branding_status='' or s.branding_status::text=p_branding_status)
    and (p_search is null or p_search='' or concat_ws(' ',s.store_code,s.store_name,s.owner_name,s.owner_phone,s.salesman_code,s.salesman_name_snapshot,s.pic_name_snapshot,s.stockpoint_name_snapshot) ilike '%'||p_search||'%')
  order by s.created_at desc
  limit greatest(1,least(p_limit,500)) offset greatest(p_offset,0);
$$;
revoke all on function public.report_submissions(text,text,text,integer,integer) from public;
grant execute on function public.report_submissions(text,text,text,integer,integer) to authenticated;

create or replace function public.dashboard_summary_v2()
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare v_role public.app_role:=public.current_app_role(); v_uid uuid:=auth.uid(); result jsonb;
begin
  with base as (
    select * from public.submissions s
    where s.deleted_at is null and s.workflow_status='done' and (v_role<>'pic' or s.pic_user_id=v_uid)
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
    select case when v_role='pic' then stockpoint_name_snapshot else branch_name_snapshot end label,count(*) value from base group by 1 order by 1
  ),
  trend as (
    select installation_date::text label,count(*) value from base where installation_date>=current_date-interval '13 days' group by installation_date order by installation_date
  )
  select jsonb_build_object(
    'total_visit',(select count(*) from base),
    'brandable',(select count(*) from base where branding_status='brandable'),
    'not_brandable',(select count(*) from base where branding_status='not_brandable'),
    'warung',(select count(*) from base where store_type='warung'),
    'grosir',(select count(*) from base where store_type='grosir'),
    'stockpoints_touched',(select count(distinct stockpoint_id) from base),
    'stockpoints_total',case when v_role='pic' then (select count(*) from public.pic_stockpoint_assignments where pic_user_id=v_uid and is_active=true) else (select count(*) from public.stockpoints where is_active=true) end,
    'brandable_photo_denominator',(select count(*) from brandable_base),
    'photo_store_before',(select count(*) from photos where coalesce(store_before,false)),
    'photo_chiller_before',(select count(*) from photos where coalesce(chiller_before,false)),
    'photo_chiller_after',(select count(*) from photos where coalesce(chiller_after,false)),
    'photo_wobbler_after',(select count(*) from photos where coalesce(wobbler_after,false)),
    'photo_poster_after',(select count(*) from photos where coalesce(poster_after,false)),
    'photo_spanduk_after',(select count(*) from photos where coalesce(spanduk_after,false)),
    'branch_counts',coalesce((select jsonb_agg(branch_counts) from branch_counts),'[]'::jsonb),
    'trend',coalesce((select jsonb_agg(trend) from trend),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.dashboard_summary_v2() from public;
grant execute on function public.dashboard_summary_v2() to authenticated;

commit;
