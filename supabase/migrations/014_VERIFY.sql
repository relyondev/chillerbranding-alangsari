-- 014_VERIFY.sql
-- Historical Stockpoint seed verification helper.
-- This does not require an exact row count because master Stockpoints can be
-- added after the original seed. It surfaces current active coverage by Branch.
select
  b.code as branch_code,
  b.name as branch_name,
  count(s.id) filter (where s.is_active) as active_stockpoints,
  count(s.id) as total_stockpoints
from public.branches b
left join public.stockpoints s on s.branch_id = b.id
group by b.id, b.code, b.name
order by b.code;
