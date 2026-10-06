select
  conname,
  pg_get_constraintdef(oid) as definition,
  convalidated
from pg_constraint
where conrelid = 'public.submissions'::regclass
  and conname in ('location_accuracy_max_5m','location_accuracy_max_50m')
order by conname;

-- Expected:
-- only location_accuracy_max_50m exists
-- definition contains location_accuracy_meters <= 50
