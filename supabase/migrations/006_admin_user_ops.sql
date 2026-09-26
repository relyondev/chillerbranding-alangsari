begin;

alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_email_unique on public.profiles(lower(email)) where email is not null;

create table public.branch_pic_sequences (
  branch_id uuid primary key references public.branches(id) on delete cascade,
  last_value integer not null default 0 check(last_value >= 0)
);

insert into public.branch_pic_sequences(branch_id,last_value)
select id,0 from public.branches
on conflict(branch_id) do nothing;

create or replace function public.admin_finalize_user(
  p_actor_user_id uuid,
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role public.app_role,
  p_branch_id uuid default null,
  p_stockpoint_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor public.profiles;
  v_branch public.branches;
  v_seq integer;
  v_pic_code text;
  v_sp uuid;
begin
  select * into v_actor from public.profiles where id=p_actor_user_id and is_active=true;
  if v_actor.id is null or v_actor.role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  if p_role='super_admin' and v_actor.role<>'super_admin' then raise exception 'super_admin_required'; end if;

  insert into public.profiles(id,email,full_name,phone,role,is_active)
  values(p_auth_user_id,lower(trim(p_email)),trim(p_full_name),nullif(trim(p_phone),''),p_role,true);

  if p_role='pic' then
    if p_branch_id is null then raise exception 'pic_branch_required'; end if;
    select * into v_branch from public.branches where id=p_branch_id and is_active=true;
    if v_branch.id is null then raise exception 'branch_not_found'; end if;

    update public.branch_pic_sequences
    set last_value=last_value+1
    where branch_id=p_branch_id
    returning last_value into v_seq;

    v_pic_code := v_branch.code || '-' || lpad(v_seq::text,2,'0');

    insert into public.pic_profiles(user_id,branch_id,pic_code,sequence_number)
    values(p_auth_user_id,p_branch_id,v_pic_code,v_seq);

    foreach v_sp in array p_stockpoint_ids loop
      if not exists(select 1 from public.stockpoints where id=v_sp and branch_id=p_branch_id and is_active=true)
        then raise exception 'stockpoint_branch_mismatch'; end if;
      insert into public.pic_stockpoint_assignments(pic_user_id,stockpoint_id,assigned_by,is_active)
      values(p_auth_user_id,v_sp,p_actor_user_id,true);
    end loop;
  end if;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(p_actor_user_id,'user_created','profile',p_auth_user_id,jsonb_build_object('role',p_role,'email',lower(trim(p_email))));

  return jsonb_build_object('user_id',p_auth_user_id,'pic_code',v_pic_code);
end;
$$;

revoke all on function public.admin_finalize_user(uuid,uuid,text,text,text,public.app_role,uuid,uuid[]) from public;
grant execute on function public.admin_finalize_user(uuid,uuid,text,text,text,public.app_role,uuid,uuid[]) to service_role;

commit;
