begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'admin', 'pic', 'client');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_code_format check (code ~ '^[A-Z]{3}$')
);

insert into public.branches(code, name) values
('BGR','BOGOR'),
('SMG','SEMARANG'),
('YOG','YOGYAKARTA'),
('SBY','SURABAYA'),
('MLG','MALANG');

create table public.stockpoints (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id, code),
  unique(branch_id, name)
);

create table public.pic_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  pic_code text not null unique,
  sequence_number integer not null check (sequence_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id, sequence_number)
);

create table public.pic_stockpoint_assignments (
  id uuid primary key default gen_random_uuid(),
  pic_user_id uuid not null references public.pic_profiles(user_id) on delete cascade,
  stockpoint_id uuid not null references public.stockpoints(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  is_active boolean not null default true
);

create unique index one_active_pic_per_stockpoint
on public.pic_stockpoint_assignments(stockpoint_id)
where is_active = true;

create index pic_assignments_pic_idx on public.pic_stockpoint_assignments(pic_user_id) where is_active = true;

commit;
