-- READ ONLY VERIFY
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in ('report_submissions','dashboard_summary') order by routine_name;
