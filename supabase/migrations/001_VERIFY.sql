-- READ ONLY VERIFY
select code, name, is_active from public.branches order by code;

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.branches') as branches,
  to_regclass('public.stockpoints') as stockpoints,
  to_regclass('public.pic_profiles') as pic_profiles,
  to_regclass('public.pic_stockpoint_assignments') as assignments;

select typname
from pg_type
where typname = 'app_role';
