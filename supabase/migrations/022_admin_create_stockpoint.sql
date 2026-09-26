begin;

create or replace function public.admin_create_stockpoint(
  p_branch_id uuid,
  p_code text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_role public.app_role;
  v_id uuid;
  v_code text := upper(trim(p_code));
  v_name text := upper(trim(p_name));
begin
  select role into v_role from public.profiles where id=auth.uid() and is_active=true;
  if v_role not in ('super_admin','admin') then raise exception 'forbidden'; end if;
  if p_branch_id is null or not exists(select 1 from public.branches where id=p_branch_id and is_active=true) then raise exception 'branch_not_found'; end if;
  if length(v_code)<1 or length(v_code)>40 then raise exception 'invalid_stockpoint_code'; end if;
  if length(v_name)<2 or length(v_name)>120 then raise exception 'invalid_stockpoint_name'; end if;

  insert into public.stockpoints(branch_id,code,name,is_active)
  values(p_branch_id,v_code,v_name,true)
  returning id into v_id;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,after_data)
  values(auth.uid(),'stockpoint_created','stockpoint',v_id,jsonb_build_object('branch_id',p_branch_id,'code',v_code,'name',v_name));

  return v_id;
exception
  when unique_violation then
    raise exception 'stockpoint_already_exists';
end;
$$;

revoke all on function public.admin_create_stockpoint(uuid,text,text) from public;
grant execute on function public.admin_create_stockpoint(uuid,text,text) to authenticated;

commit;
