begin;

create index if not exists integration_jobs_pending_idx on public.integration_jobs(status,next_retry_at,created_at);
create index if not exists submission_photos_submission_idx on public.submission_photos(submission_id,is_active);

create or replace function public.claim_integration_jobs(p_limit integer default 10)
returns setof public.integration_jobs
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with picked as (
    select id from public.integration_jobs
    where status in ('pending','failed')
      and (next_retry_at is null or next_retry_at<=now())
    order by created_at
    for update skip locked
    limit greatest(1,least(p_limit,50))
  )
  update public.integration_jobs j
  set status='processing',attempt_count=attempt_count+1
  from picked
  where j.id=picked.id
  returning j.*;
end;
$$;

create or replace function public.finish_integration_job(p_job_id uuid,p_success boolean,p_error text default null)
returns void
language sql
security definer
set search_path=public
as $$
  update public.integration_jobs
  set status=case when p_success then 'completed'::public.integration_job_status else 'failed'::public.integration_job_status end,
      last_error=case when p_success then null else left(p_error,2000) end,
      completed_at=case when p_success then now() else null end,
      next_retry_at=case when p_success then null else now()+least(interval '30 minutes', interval '1 minute' * power(2,greatest(attempt_count,1))) end
  where id=p_job_id
$$;

revoke all on function public.claim_integration_jobs(integer) from public;
revoke all on function public.finish_integration_job(uuid,boolean,text) from public;
grant execute on function public.claim_integration_jobs(integer) to service_role;
grant execute on function public.finish_integration_job(uuid,boolean,text) to service_role;

commit;
