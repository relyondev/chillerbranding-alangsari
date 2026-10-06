-- V1.7.2 — relax accepted browser GPS accuracy from <=5m to <=50m.
-- Existing data is preserved. Marker correction remains enforced in frontend at max 3m.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'location_accuracy_max_5m'
      and conrelid = 'public.submissions'::regclass
  ) then
    alter table public.submissions drop constraint location_accuracy_max_5m;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'location_accuracy_max_50m'
      and conrelid = 'public.submissions'::regclass
  ) then
    alter table public.submissions
      add constraint location_accuracy_max_50m
      check (location_accuracy_meters is null or location_accuracy_meters <= 50)
      not valid;
  end if;
end $$;
