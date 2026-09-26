begin;

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
  -- New system volume is modest; one transaction-scoped lock gives a simple,
  -- deterministic guard against two concurrent >=3/4 duplicate inserts.
  perform pg_advisory_xact_lock(726144731);

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
      using errcode = 'P0001', detail = v_duplicate::text;
  end if;
end;
$$;

commit;
