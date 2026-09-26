begin;

alter table public.submissions add column if not exists operation_lock text;
alter table public.submission_photos add column if not exists external_deleted_at timestamptz;

create or replace function public.begin_reopen_submission(p_actor uuid,p_submission_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_actor public.profiles; v public.submissions;
begin
  select * into v_actor from public.profiles where id=p_actor and is_active=true;
  if v_actor.role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  if length(trim(p_reason))=0 then raise exception 'reason_required'; end if;

  select * into v from public.submissions where id=p_submission_id and deleted_at is null for update;
  if v.workflow_status<>'done' then raise exception 'done_required'; end if;
  if v.operation_lock is not null and v.operation_lock<>'reopening' then raise exception 'operation_locked'; end if;

  update public.submissions set operation_lock='reopening',updated_at=now() where id=v.id;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,reason,before_data)
  values(p_actor,'reopen_started','submission',v.id,trim(p_reason),jsonb_build_object('workflow_status',v.workflow_status));

  return jsonb_build_object('submission_id',v.id,'photo_file_ids',
    coalesce((select jsonb_agg(jsonb_build_object('photo_id',p.id,'drive_file_id',p.drive_file_id))
      from public.submission_photos p where p.submission_id=v.id and p.is_active=true),'[]'::jsonb));
end;
$$;

create or replace function public.finalize_reopen_submission(p_actor uuid,p_submission_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_actor public.profiles;
begin
  select * into v_actor from public.profiles where id=p_actor and is_active=true;
  if v_actor.role not in ('super_admin','admin') then raise exception 'forbidden'; end if;

  update public.submission_photos set is_active=false,external_deleted_at=coalesce(external_deleted_at,now()) where submission_id=p_submission_id and is_active=true;
  update public.submissions set workflow_status='draft',submitted_at=null,operation_lock=null,reopen_count=reopen_count+1,last_reopened_at=now(),updated_at=now(),version=version+1 where id=p_submission_id and operation_lock='reopening';

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,reason,after_data)
  values(p_actor,'submission_reopened','submission',p_submission_id,trim(p_reason),jsonb_build_object('workflow_status','draft'));
end;
$$;

revoke all on function public.begin_reopen_submission(uuid,uuid,text) from public;
revoke all on function public.finalize_reopen_submission(uuid,uuid,text) from public;
grant execute on function public.begin_reopen_submission(uuid,uuid,text) to service_role;
grant execute on function public.finalize_reopen_submission(uuid,uuid,text) to service_role;

commit;
