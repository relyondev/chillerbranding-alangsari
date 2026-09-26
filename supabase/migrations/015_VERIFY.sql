-- 015_VERIFY.sql
-- READ ONLY VERIFY

-- 1) dashboard_summary must remain SECURITY DEFINER.
select
  p.proname,
  case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'dashboard_summary';

-- Expected: dashboard_summary | DEFINER

-- 2) Confirm PIC assignment uniqueness and active assignment counts.
select
  p.full_name as pic_name,
  pp.pic_code,
  count(psa.stockpoint_id) filter (where psa.is_active) as active_stockpoints
from public.profiles p
left join public.pic_profiles pp on pp.user_id = p.id
left join public.pic_stockpoint_assignments psa on psa.pic_user_id = p.id
where p.role = 'pic'
group by p.id, p.full_name, pp.pic_code
order by p.full_name;

-- 3) No Stockpoint may have more than one active PIC.
select
  psa.stockpoint_id,
  count(*) as active_pic_count
from public.pic_stockpoint_assignments psa
where psa.is_active = true
group by psa.stockpoint_id
having count(*) > 1;

-- Expected: 0 rows.
