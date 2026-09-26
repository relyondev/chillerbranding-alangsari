begin;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index audit_actor_idx on public.audit_events(actor_user_id, created_at desc);

alter table public.audit_events enable row level security;

create policy audit_admin_read on public.audit_events
for select to authenticated
using (public.current_app_role() in ('super_admin','admin'));

commit;
