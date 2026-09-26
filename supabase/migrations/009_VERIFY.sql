-- READ ONLY VERIFY
select column_name from information_schema.columns where table_schema='public' and table_name='submissions' and column_name='operation_lock';
select routine_name from information_schema.routines where routine_schema='public' and routine_name in ('begin_reopen_submission','finalize_reopen_submission') order by routine_name;
