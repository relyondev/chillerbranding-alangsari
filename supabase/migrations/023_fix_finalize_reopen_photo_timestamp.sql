begin;

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
  v_actor public.profiles;
  v public.submissions;
begin
  select * into v_actor
  from public.profiles
  where id=p_actor and is_active=true;

  if v_actor.role not in ('super_admin','admin') then
    raise exception 'forbidden';
  end if;

  select * into v
  from public.submissions
  where id=p_submission_id and deleted_at is null
  for update;

  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.operation_lock <> 'reopening' then raise exception 'reopen_not_started'; end if;

  update public.submission_photos
  set is_active=false,
      external_deleted_at=coalesce(external_deleted_at,now())
  where submission_id=v.id and is_active=true;

  update public.submissions
  set workflow_status='draft',
      submitted_at=null,
      operation_lock=null,
      reopen_count=reopen_count+1,
      reopen_reason=trim(p_reason),
      reopened_at=now(),
      drive_store_folder_id=null,
      updated_at=now(),
      version=version+1
  where id=v.id;

  insert into public.audit_events(
    actor_user_id,event_type,entity_type,entity_id,reason,after_data
  )
  values(
    p_actor,
    'submission_reopened',
    'submission',
    v.id,
    trim(p_reason),
    jsonb_build_object('workflow_status','draft')
  );
end;
$$;

revoke all on function public.finalize_reopen_submission(uuid,uuid,text) from public;
grant execute on function public.finalize_reopen_submission(uuid,uuid,text) to service_role;

commit;
