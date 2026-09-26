begin;

create or replace function public.submit_submission(p_submission_id uuid,p_expected_version integer)
returns public.submissions
language plpgsql
security definer
set search_path=public
as $$
declare v public.submissions; v_required public.photo_type[]; v_count integer;
begin
  select * into v from public.submissions where id=p_submission_id and deleted_at is null for update;
  if v.id is null then raise exception 'submission_not_found'; end if;
  if v.pic_user_id<>auth.uid() then raise exception 'submission_not_owned'; end if;
  if v.workflow_status<>'draft' then raise exception 'submission_not_draft'; end if;
  if v.version<>p_expected_version then raise exception 'stale_submission_version'; end if;

  perform public.assert_no_duplicate_submission(v.store_name,v.owner_name,v.owner_phone,v.stockpoint_id,v.id);

  if v.branding_status='brandable' then
    if v.has_chiller then
      v_required:=array['store_before','chiller_before','chiller_after','wobbler_after','poster_after','spanduk_after']::public.photo_type[];
    else
      v_required:=array['store_before','wobbler_after','poster_after','spanduk_after']::public.photo_type[];
    end if;

    select count(distinct photo_type) into v_count
    from public.submission_photos where submission_id=v.id and is_active=true and photo_type=any(v_required);

    if v_count<>cardinality(v_required) then raise exception 'required_photos_incomplete'; end if;
  end if;

  update public.submissions set workflow_status='done',submitted_at=now(),updated_at=now(),version=version+1 where id=v.id returning * into v;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(auth.uid(),'submission_submitted','submission',v.id,jsonb_build_object('branding_status',v.branding_status));

  insert into public.integration_jobs(job_type,entity_id,idempotency_key)
  values('spreadsheet_upsert',v.id,'spreadsheet_upsert:'||v.id::text||':'||v.version::text)
  on conflict(idempotency_key) do nothing;

  return v;
end;
$$;

commit;
