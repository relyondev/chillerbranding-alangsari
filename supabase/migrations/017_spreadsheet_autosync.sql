begin;

create or replace function public.enqueue_submission_spreadsheet_sync()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.deleted_at is null then
    insert into public.integration_jobs(
      job_type,
      entity_id,
      idempotency_key
    )
    values(
      'spreadsheet_upsert',
      new.id,
      'spreadsheet_upsert:' || new.id::text || ':auto:' || new.version::text
    )
    on conflict(idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_spreadsheet_autosync
on public.submissions;

create trigger submissions_spreadsheet_autosync
after insert or update of
  workflow_status,
  branding_status,
  store_code,
  store_name,
  owner_name,
  owner_phone,
  store_address,
  latitude,
  longitude,
  store_type,
  has_chiller,
  not_brandable_reason
on public.submissions
for each row
execute function public.enqueue_submission_spreadsheet_sync();

-- Backfill every current non-deleted submission into the durable queue.
insert into public.integration_jobs(
  job_type,
  entity_id,
  idempotency_key
)
select
  'spreadsheet_upsert',
  s.id,
  'spreadsheet_upsert:' || s.id::text || ':backfill017:' || s.version::text
from public.submissions s
where s.deleted_at is null
on conflict(idempotency_key) do nothing;

commit;
