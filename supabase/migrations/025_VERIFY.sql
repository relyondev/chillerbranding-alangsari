-- VERIFY 025: V1.5 manual PIC ID + store code 2..6 digits
select pg_get_constraintdef(oid) as store_code_constraint
from pg_constraint
where conrelid='public.submissions'::regclass and conname='store_code_format';

select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('admin_finalize_user','create_submission_draft','admin_update_reopened_submission')
order by p.proname;

select b.code as branch_code, pp.sequence_number, pp.pic_code
from public.pic_profiles pp
join public.branches b on b.id=pp.branch_id
where pp.pic_code <> b.code || '-' || lpad(pp.sequence_number::text,2,'0')
order by b.code, pp.sequence_number;
