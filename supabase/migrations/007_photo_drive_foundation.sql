begin;

create type public.photo_type as enum ('store_before','chiller_before','chiller_after','wobbler_after','poster_after','spanduk_after');
create type public.integration_job_status as enum ('pending','processing','completed','failed');

create table public.submission_photos (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  photo_type public.photo_type not null,
  drive_file_id text not null,
  drive_folder_id text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check(file_size > 0),
  is_active boolean not null default true,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  replaced_at timestamptz
);

create unique index one_active_photo_per_slot
on public.submission_photos(submission_id,photo_type)
where is_active=true;

create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  entity_id uuid not null,
  idempotency_key text not null unique,
  status public.integration_job_status not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.submission_photos enable row level security;
alter table public.integration_jobs enable row level security;

create policy submission_photos_read on public.submission_photos
for select to authenticated using (
  is_active=true and exists(
    select 1 from public.submissions s
    where s.id=submission_id and s.deleted_at is null
      and (s.pic_user_id=auth.uid() or public.current_app_role() in ('super_admin','admin','client'))
  )
);

create policy integration_jobs_admin_read on public.integration_jobs
for select to authenticated using(public.current_app_role() in ('super_admin','admin'));

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
declare v_old public.submission_photos; v_new uuid; v_version integer;
begin
  if not exists(select 1 from public.submissions where id=p_submission_id and workflow_status='draft' and deleted_at is null)
    then raise exception 'submission_not_editable'; end if;

  select * into v_old from public.submission_photos
  where submission_id=p_submission_id and photo_type=p_photo_type and is_active=true
  for update;

  if v_old.id is not null then
    update public.submission_photos set is_active=false,replaced_at=now() where id=v_old.id;
  end if;

  insert into public.submission_photos(submission_id,photo_type,drive_file_id,drive_folder_id,file_name,mime_type,file_size,uploaded_by)
  values(p_submission_id,p_photo_type,p_drive_file_id,p_drive_folder_id,p_file_name,p_mime_type,p_file_size,p_uploaded_by)
  returning id into v_new;

  update public.submissions set drive_store_folder_id=coalesce(drive_store_folder_id,p_drive_folder_id),updated_at=now(),version=version+1 where id=p_submission_id returning version into v_version;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(p_uploaded_by,case when v_old.id is null then 'photo_uploaded' else 'photo_replaced' end,'submission',p_submission_id,jsonb_build_object('photo_type',p_photo_type,'photo_id',v_new));

  if v_old.id is not null then
    insert into public.integration_jobs(job_type,entity_id,idempotency_key)
    values('drive_cleanup',v_old.id,'drive_cleanup:'||v_old.id::text)
    on conflict(idempotency_key) do nothing;
  end if;

  return jsonb_build_object('photo_id',v_new,'old_drive_file_id',v_old.drive_file_id,'version',v_version);
end;
$$;

revoke all on function public.register_uploaded_photo(uuid,public.photo_type,text,text,text,text,bigint,uuid) from public;
grant execute on function public.register_uploaded_photo(uuid,public.photo_type,text,text,text,text,bigint,uuid) to service_role;

commit;
