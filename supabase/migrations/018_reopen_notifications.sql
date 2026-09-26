begin;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_read_own on public.user_notifications;
create policy user_notifications_read_own
on public.user_notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.submissions
  add column if not exists reopen_reason text,
  add column if not exists reopened_at timestamptz;

create or replace function public.finalize_reopen_submission(
  p_actor uuid,
  p_submission_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.submissions;
begin
  select * into v
  from public.submissions
  where id=p_submission_id and deleted_at is null
  for update;

  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.operation_lock <> 'reopening' then raise exception 'reopen_not_started'; end if;

  update public.submission_photos
  set is_active=false, updated_at=now()
  where submission_id=v.id and is_active=true;

  update public.submissions
  set workflow_status='draft',
      operation_lock=null,
      reopen_count=reopen_count+1,
      reopen_reason=trim(p_reason),
      reopened_at=now(),
      drive_store_folder_id=null,
      updated_at=now(),
      version=version+1
  where id=v.id;

  insert into public.user_notifications(
    user_id,type,title,message,entity_type,entity_id
  )
  values(
    v.pic_user_id,
    'submission_reopened',
    'Pekerjaan dibuka kembali',
    trim(p_reason),
    'submission',
    v.id
  );

  insert into public.audit_events(
    actor_user_id,event_type,entity_type,entity_id,after_data
  )
  values(
    p_actor,'submission_reopened','submission',v.id,
    jsonb_build_object('reason',trim(p_reason),'pic_user_id',v.pic_user_id)
  );
end;
$$;

grant execute on function public.finalize_reopen_submission(uuid,uuid,text) to service_role;

commit;
