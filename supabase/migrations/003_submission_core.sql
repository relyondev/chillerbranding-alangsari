begin;

create type public.workflow_status as enum ('draft','done');
create type public.branding_status as enum ('brandable','not_brandable');
create type public.store_type as enum ('grosir','warung');

create table public.submissions (
  id uuid primary key default gen_random_uuid(),

  pic_user_id uuid not null references public.pic_profiles(user_id),
  pic_code_snapshot text not null,
  pic_name_snapshot text not null,

  branch_id uuid not null references public.branches(id),
  branch_code_snapshot text not null,
  branch_name_snapshot text not null,

  stockpoint_id uuid not null references public.stockpoints(id),
  stockpoint_code_snapshot text not null,
  stockpoint_name_snapshot text not null,

  installation_date date not null default current_date,

  salesman_code_part_1 text not null,
  salesman_code_part_2 text not null,
  salesman_code_part_3 text not null,
  salesman_code text not null,

  store_code text not null,
  store_name text not null,
  store_name_normalized text not null,
  owner_name text not null,
  owner_name_normalized text not null,
  owner_phone text not null,
  owner_phone_normalized text not null,
  store_address text not null,

  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  location_accuracy_meters numeric(10,2) not null,
  location_captured_at timestamptz not null default now(),
  location_source text not null default 'browser_geolocation',

  store_type public.store_type not null,
  has_chiller boolean not null,

  branding_status public.branding_status not null,
  not_brandable_reason text,

  workflow_status public.workflow_status not null default 'draft',
  submitted_at timestamptz,

  reopen_count integer not null default 0,
  last_reopened_at timestamptz,
  version integer not null default 1,

  drive_store_folder_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  delete_reason text,

  constraint salesman_part_1_format check (salesman_code_part_1 ~ '^\d{4}$'),
  constraint salesman_part_2_format check (salesman_code_part_2 ~ '^\d{3}$'),
  constraint salesman_part_3_format check (salesman_code_part_3 ~ '^[A-Z][A-Z0-9]{2,3}$'),
  constraint salesman_code_format check (
    salesman_code = salesman_code_part_1 || '/' || salesman_code_part_2 || '/' || salesman_code_part_3
  ),
  constraint store_code_format check (store_code ~ '^\d{3,4}$'),
  constraint lat_range check (latitude between -90 and 90),
  constraint lng_range check (longitude between -180 and 180),
  constraint accuracy_positive check (location_accuracy_meters >= 0),
  constraint branding_reason_rule check (
    (branding_status = 'brandable' and not_brandable_reason is null)
    or
    (branding_status = 'not_brandable' and length(trim(not_brandable_reason)) > 0)
  )
);

create index submissions_pic_idx on public.submissions(pic_user_id) where deleted_at is null;
create index submissions_branch_idx on public.submissions(branch_id) where deleted_at is null;
create index submissions_stockpoint_idx on public.submissions(stockpoint_id) where deleted_at is null;
create index submissions_status_idx on public.submissions(workflow_status, branding_status) where deleted_at is null;

alter table public.submissions enable row level security;

create policy submissions_read on public.submissions
for select to authenticated
using (
  deleted_at is null
  and (
    pic_user_id = auth.uid()
    or public.current_app_role() in ('super_admin','admin','client')
  )
);

commit;
