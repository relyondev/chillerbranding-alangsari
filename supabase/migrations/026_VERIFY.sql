-- V1.6.0 verification (read-only)
select to_regclass('public.salesmen') as salesmen_table;
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='submissions' and column_name in ('salesman_id','salesman_name_snapshot','last_admin_edited_at','last_admin_editor_name') order by column_name;
select proname,pg_get_function_identity_arguments(oid) args from pg_proc where pronamespace='public'::regnamespace and proname in ('pic_create_salesman','admin_save_salesman','admin_delete_salesman','admin_update_done_submission','dashboard_summary_v2','report_submissions') order by proname;
select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.submissions'::regclass and conname='salesman_part_3_format';
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='salesmen' order by indexname;
