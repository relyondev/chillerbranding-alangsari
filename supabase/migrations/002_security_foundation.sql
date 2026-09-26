begin;

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.stockpoints enable row level security;
alter table public.pic_profiles enable row level security;
alter table public.pic_stockpoint_assignments enable row level security;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create policy profiles_self_read on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('super_admin','admin')
  or public.current_app_role() = 'client'
);

create policy branches_authenticated_read on public.branches
for select to authenticated using (true);

create policy stockpoints_authenticated_read on public.stockpoints
for select to authenticated using (true);

create policy pic_profiles_authenticated_read on public.pic_profiles
for select to authenticated
using (
  user_id = auth.uid()
  or public.current_app_role() in ('super_admin','admin','client')
);

create policy assignments_read on public.pic_stockpoint_assignments
for select to authenticated
using (
  pic_user_id = auth.uid()
  or public.current_app_role() in ('super_admin','admin','client')
);

commit;
