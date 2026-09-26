-- READ ONLY VERIFY
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email';
select to_regclass('public.branch_pic_sequences') as branch_pic_sequences;
select b.code,s.last_value from public.branch_pic_sequences s join public.branches b on b.id=s.branch_id order by b.code;
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name='admin_finalize_user';
